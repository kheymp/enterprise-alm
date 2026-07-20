# Guide: Admin-only user provisioning (remove self-registration, force first-login password change)

## Context
This is an Enterprise ALM system, so public self-signup doesn't belong. Goal: **remove the
registration page/button** and make **admins the only way users are created**.

There's a latent bug this forces you to fix: `CreateUserAsync`
([UserService.cs:32-53](../apps/backend/Enterprise.ALM.Application/Services/UserService.cs#L32-L53))
creates a user but **never sets a password hash** — so admin-created users currently can't log in.
The only thing setting a real password today is the `/register` flow you're removing.

**The approach (auto-generated temp password):**
- When an admin creates a user, the system generates a strong random temporary password, stores it
  hashed, and flags the account `MustChangePassword = true`.
- The Add User dialog shows that temp password **once** with a Copy button; the admin passes it to
  the user out-of-band.
- On first login, the user is forced to a **Change Password** screen before they can use the app.
- Public registration (page, route, link, and backend endpoint) is deleted entirely.

Why this reads well to an interviewer: it's the classic enterprise credential lifecycle
(temp secret → forced rotation → admin never knows the permanent password), and it's self-contained
(no email server). The production-grade version would be an emailed invite token.

Each step names the file and exactly where the code goes.

---

# PART A — Backend

## A1. Add the `MustChangePassword` flag + migration

**File:** [User.cs](../apps/backend/Enterprise.ALM.Domain/Entities/User.cs) — add one property (put
it next to `IsActive`):
```csharp
public bool MustChangePassword { get; set; } = false;
```

Then create + apply the migration (same commands as your other migrations):
```
dotnet ef migrations add AddMustChangePasswordToUser --project apps/backend/Enterprise.ALM.Infrastructure --startup-project apps/backend/Enterprise.ALM.Api
dotnet ef database update --project apps/backend/Enterprise.ALM.Infrastructure --startup-project apps/backend/Enterprise.ALM.Api
```
EF generates the `AddColumn` automatically (default `false`) — you don't hand-edit this migration.

## A2. Generate + return a temp password on create

**File:** [UserService.cs](../apps/backend/Enterprise.ALM.Application/Services/UserService.cs)

Add these two `using`s at the top:
```csharp
using System.Security.Cryptography;
using System.Text;
```

**Replace** the whole `CreateUserAsync` method (lines 32-53) with:
```csharp
    public async Task<UserResponseDto> CreateUserAsync(CreateUserDto dto)
    {
        var tempPassword = GenerateTempPassword();

        var user = new User
        {
            Username = dto.Username,
            Email = dto.Email,
            Department = dto.Department,
            IsActive = dto.IsActive,
            RoleId = dto.RoleId == 0 ? 3 : dto.RoleId,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(tempPassword),
            MustChangePassword = true
        };
        await _userRepository.AddAsync(user);
        await _userRepository.SaveChangesAsync();

        return new UserResponseDto
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            Department = user.Department,
            IsActive = user.IsActive,
            RoleId = user.RoleId,
            TemporaryPassword = tempPassword   // returned ONCE so the admin can share it
        };
    }

    private static string GenerateTempPassword()
    {
        // Excludes lookalike chars (0/O, 1/l/I) so it's easy to read aloud/type.
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
        var bytes = RandomNumberGenerator.GetBytes(14);
        var sb = new StringBuilder(14);
        foreach (var b in bytes) sb.Append(chars[b % chars.Length]);
        return sb.ToString();
    }
```
> `BCrypt.Net.BCrypt` is already used in this project (see `AuthService`), so no new package.

**File:** [UserResponseDto.cs](../apps/backend/Enterprise.ALM.Application/DTOs/User/UserResponseDto.cs)
— add one nullable property (it stays `null` on list/read; only `CreateUserAsync` fills it):
```csharp
    public string? TemporaryPassword { get; set; }
```

## A3. Make login report "must change password"

**File:** [AuthResponseDto.cs](../apps/backend/Enterprise.ALM.Application/DTOs/Auth/AuthResponseDto.cs)
— add:
```csharp
    public bool MustChangePassword { get; set; }
```

**File:** [AuthService.cs](../apps/backend/Enterprise.ALM.Application/Services/AuthService.cs) —
refactor so the token-building code is reusable, and add the flag. **Replace `LoginAsync`
(lines 23-48)** with the following two methods (`LoginAsync` + a new private `GenerateToken`):
```csharp
    public async Task<AuthResponseDto?> LoginAsync(LoginRequestDto dto)
    {
        var user = await _userRepository.GetByEmailAsync(dto.Email);
        if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return null;

        return new AuthResponseDto
        {
            Token = GenerateToken(user),
            MustChangePassword = user.MustChangePassword
        };
    }

    private string GenerateToken(User user)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_configuration["JwtSettings:SecretKey"]!);
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role!.Name),
                new Claim("mustChangePassword", user.MustChangePassword.ToString().ToLower())
            }),
            Expires = DateTime.UtcNow.AddMinutes(
                double.Parse(_configuration["JwtSettings:ExpirationInMinutes"]!)),
            Issuer = _configuration["JwtSettings:Issuer"],
            Audience = _configuration["JwtSettings:Audience"],
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature)
        };
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }
```
> The custom `"mustChangePassword"` claim is a plain string `"true"`/`"false"`. Custom claim names
> aren't remapped by .NET, so the frontend reads it back as exactly `mustChangePassword`.

## A4. Add the change-password endpoint

**New file:** `apps/backend/Enterprise.ALM.Application/DTOs/Auth/ChangePasswordDto.cs`
```csharp
namespace Enterprise.ALM.Application.DTOs.Auth;

public class ChangePasswordDto
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}
```

**File:** [IAuthService.cs](../apps/backend/Enterprise.ALM.Application/Interfaces/IAuthService.cs) —
`RegisterAsync` gets **removed** here in Part C; for now add:
```csharp
    Task<AuthResponseDto?> ChangePasswordAsync(string email, ChangePasswordDto dto);
```

**File:** `AuthService.cs` — add this method. Note it looks the user up **by email**
(`GetByEmailAsync` loads the `Role`; `GetByIdAsync` does not, and `GenerateToken` needs the role):
```csharp
    public async Task<AuthResponseDto?> ChangePasswordAsync(string email, ChangePasswordDto dto)
    {
        var user = await _userRepository.GetByEmailAsync(email);
        if (user == null || !BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
            return null;

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        user.MustChangePassword = false;
        await _userRepository.SaveChangesAsync();

        return new AuthResponseDto { Token = GenerateToken(user), MustChangePassword = false };
    }
```

**File:** [AuthController.cs](../apps/backend/Enterprise.ALM.Api/Controllers/AuthController.cs) — add
`using System.Security.Claims;` at the top, then add this action (the `Register` action is deleted
in Part C):
```csharp
        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto request)
        {
            var email = User.FindFirstValue(ClaimTypes.Email);
            if (email == null) return Unauthorized();

            var result = await _authService.ChangePasswordAsync(email, request);
            if (result == null) return BadRequest("Current password is incorrect.");
            return Ok(result);
        }
```
> Reading the email from `ClaimTypes.Email` matches how `ApplicationDbContext.GetCurrentUsername`
> already reads the logged-in user — proven to work, so no JWT claim-mapping surprises.

---

# PART B — Frontend

## B1. Remove the registration UI
- **Delete the file** [Register.tsx](../apps/frontend/src/pages/Register.tsx).
- **File** [App.tsx](../apps/frontend/src/App.tsx): delete the import on line 4
  (`import Register from './pages/Register';`) and the route on line 40
  (`<Route path="/register" element={<Register />} />`).
- **File** [Login.tsx](../apps/frontend/src/pages/Login.tsx): delete the "Don't have an account?…
  Register here" block (lines 101-108, the `<Box sx={{ mt: 2, textAlign: 'center' }}>…</Box>`).

## B2. Route to change-password after login

**File:** [Login.tsx](../apps/frontend/src/pages/Login.tsx) — in the login submit handler, the API
response now includes `mustChangePassword`. Update the typed call and the redirect. Find:
```tsx
      const data = await api.post<{ token: string }>('/api/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      window.location.href = '/';
```
Replace with:
```tsx
      const data = await api.post<{ token: string; mustChangePassword: boolean }>(
        '/api/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      window.location.href = data.mustChangePassword ? '/change-password' : '/';
```
(If you already applied the demo-login refactor, make the same change inside `loginWith`.)

## B3. Create the Change Password page

**New file:** `apps/frontend/src/pages/ChangePassword.tsx` (mirrors your Login page style):
```tsx
import { useState } from "react";
import { Container, Card, CardContent, TextField, Button, Typography, Box, Alert } from "@mui/material";
import { api } from "../lib/api";

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirm) { setError("New passwords do not match."); return; }
    if (newPassword.length < 8) { setError("New password must be at least 8 characters."); return; }

    setLoading(true);
    try {
      const data = await api.post<{ token: string }>('/api/auth/change-password', {
        currentPassword, newPassword,
      });
      localStorage.setItem('token', data.token); // fresh token: mustChangePassword now false
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 10 }}>
      <Card elevation={3}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
              Set a New Password
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You're using a temporary password. Choose a new one to continue.
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Temporary Password" type="password" fullWidth required
              value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            <TextField label="New Password" type="password" fullWidth required
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <TextField label="Confirm New Password" type="password" fullWidth required
              value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            <Button type="submit" variant="contained" size="large" fullWidth disabled={loading} sx={{ mt: 2 }}>
              {loading ? "Saving..." : "Update Password"}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
```

## B4. Add the route + enforce it in the guard

**File:** [App.tsx](../apps/frontend/src/App.tsx)

Add the import near the other page imports:
```tsx
import ChangePassword from './pages/ChangePassword';
```

Update `ProtectedRoute` (lines 14-33) so a user who must change their password is pushed to the
change screen — with an `allowPasswordChange` escape hatch so the change page itself doesn't loop:
```tsx
const ProtectedRoute = ({
  children,
  allowedRoles,
  allowPasswordChange,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
  allowPasswordChange?: boolean;
}) => {
  const currentToken = localStorage.getItem("token");
  if (!currentToken) {
    return <Navigate to="/login" replace />;
  }
  const decoded: any = jwtDecode(currentToken);

  // Force the temp-password user onto the change screen before anything else.
  if (decoded.mustChangePassword === "true" && !allowPasswordChange) {
    return <Navigate to="/change-password" replace />;
  }

  if (allowedRoles) {
    const userRole: string = decoded.role;
    if (!allowedRoles.includes(userRole)) {
      return <Navigate to="/" replace />;
    }
  }
  return <>{children}</>;
};
```

Add the route (alongside the others). It uses the escape hatch so it isn't redirected onto itself:
```tsx
        <Route path="/change-password" element={
          <ProtectedRoute allowPasswordChange>
            <ChangePassword />
          </ProtectedRoute>
        } />
```

## B5. Show the temp password once, after creating a user

**File:** [UserManagement.tsx](../apps/frontend/src/pages/UserManagement.tsx), inside the
`UserFormDialog` component.

1. Add state near the other dialog state (around line 79):
```tsx
    const [tempPassword, setTempPassword] = useState<string | null>(null);
```
2. In the `useEffect` that runs when the dialog opens (around line 82-99), also reset it:
```tsx
            setTempPassword(null);
```
3. In `handleSubmit` (lines 113-129), capture the create response and, when creating, show the
   password instead of closing. Replace the `if (editingUser) { … } else { … }` block plus the
   `onSaved(...) / onClose()` lines with:
```tsx
            if (editingUser) {
                await api.put(`/api/users/${editingUser.id}`, payload);
                onSaved(`"${username}" updated successfully.`);
                onClose();
            } else {
                const created = await api.post<{ temporaryPassword?: string }>('/api/users', payload);
                onSaved(`"${username}" created successfully.`);
                setTempPassword(created.temporaryPassword ?? null); // keep dialog open to reveal it
            }
```
4. Render the reveal panel. Right after `<DialogContent …>` opens (around line 152), short-circuit
   the form body when a temp password exists:
```tsx
                    {tempPassword ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Alert severity="success">
                                User created. Share this temporary password — it won't be shown again.
                                They'll be required to change it at first login.
                            </Alert>
                            <TextField
                                label="Temporary Password"
                                value={tempPassword}
                                fullWidth
                                slotProps={{ input: { readOnly: true } }}
                            />
                            <Button variant="outlined" onClick={() => navigator.clipboard.writeText(tempPassword)}>
                                Copy Password
                            </Button>
                            <Button variant="contained" onClick={onClose}>Done</Button>
                        </Box>
                    ) : (
                        <>
                          {/* …the existing form fields (formError Alert, Username, Email,
                              Department, Role Select, isActive Switch) stay here, wrapped… */}
                        </>
                    )}
```
   Wrap the existing form fields inside that `( … ) : ( <> … </> )` so they only show before
   creation. Also hide the footer `DialogActions` (Cancel/Register buttons) when `tempPassword` is
   set, e.g. `{!tempPassword && ( <DialogActions> … </DialogActions> )}`.

> Editing an existing user is unchanged — no password field, no reveal.

---

# PART C — Close the self-registration hole (backend)

Deleting the frontend page isn't enough; the open endpoint must go too, or anyone can still `POST`
to it.

- **File** [AuthController.cs](../apps/backend/Enterprise.ALM.Api/Controllers/AuthController.cs):
  delete the `Register` action (lines 20-28, including the `// FOR CREATING…` comment).
- **File** [IAuthService.cs](../apps/backend/Enterprise.ALM.Application/Interfaces/IAuthService.cs):
  delete `Task<bool> RegisterAsync(RegisterRequestDto dto);`.
- **File** [AuthService.cs](../apps/backend/Enterprise.ALM.Application/Services/AuthService.cs):
  delete the entire `RegisterAsync` method (lines 50-65).
- **Delete the file**
  [RegisterRequestDto.cs](../apps/backend/Enterprise.ALM.Application/DTOs/Auth/RegisterRequestDto.cs).

Now every user is born through `POST /api/users`, which is already `[Authorize(Roles = "Admin")]`
([UsersController.cs:29-30](../apps/backend/Enterprise.ALM.Api/Controllers/UsersController.cs#L29-L30)).

---

## Interaction with the demo-admin feature (no action needed)
If you built the demo login: `DemoResetJob` creates the demo admin without setting
`MustChangePassword`, so it defaults to `false` — the public demo account logs straight in and is
never sent to the change-password screen. That's the behavior you want; just don't set the flag
`true` there.

---

## Verification (end to end)
1. **Build both projects** — the backend won't compile until `RegisterAsync` is removed from *both*
   `IAuthService` and `AuthService` (Part C), so a clean build confirms Part C is consistent.
2. **Registration is gone:** visiting `/register` no longer resolves; the Login page has no
   "Register here" link; `POST /api/auth/register` returns 404.
3. **Create a user:** log in as Admin → User Management → Add User. After Create, the dialog shows a
   temporary password with a working Copy button. Copy it.
4. **Forced change:** open a private window, log in with the new user's email + that temp password →
   you land on **/change-password**, and trying to visit `/` or `/assets` bounces you back there.
5. Submit a new password → you're taken into the app. Log out, log back in with the **new** password
   → straight to the dashboard (no change screen). The old temp password no longer works.
6. **Guard check:** the created user's JWT payload contains `mustChangePassword` (`"true"` before,
   `"false"` after the change).
