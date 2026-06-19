using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Enterprise.ALM.Infrastructure;
using Enterprise.ALM.Domain.Entities;
using Microsoft.AspNetCore.Authorization;

namespace Enterprise.ALM.Api.Controllers;


[ApiController]       
[Route("api/[controller]")] // Sets the URL path to: /api/users
[Authorize]
public class UsersController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    // The DI container automatically hands us our live database context
    public UsersController(ApplicationDbContext context)
    {
        _context = context;
    }

    // Handles an incoming HTTP GET request
    [HttpGet]
    public async Task<IActionResult> GetAllUsers()
    {
        // Ask EF Core to fetch all users AND their attached roles out of our database
        var users = await _context.Users
            .Include(u => u.Role) 
            .ToListAsync();

        // Return a 200 OK status code along with the list of users
        return Ok(users);
    }

    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] User newUser) 
    {
        var roleId = User.FindFirst("RoleId")?.Value;
if (roleId != "1") 
{
    return Forbid(); // Kicks them out with a 403 Forbidden error
}

        if (newUser.RoleId == 0)
        {
            newUser.RoleId = 2;
        }

        _context.Users.Add(newUser);
        await _context.SaveChangesAsync();
        return Ok(newUser);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var roleId = User.FindFirst("RoleId")?.Value;
    if (roleId != "1") 
    {
        return Forbid(); // Kicks them out with a 403 Forbidden error
    }

        // Search the database for a user matching the provided ID
        var user = await _context.Users.FindAsync(id);

        if (user == null)
        {
            return NotFound(); // Return a 404 Not Found if the user doesn't exist
        }

        _context.Users.Remove(user); // Mark the user for deletion

        await _context.SaveChangesAsync(); // Commit the deletion to the database

        return NoContent();
    }

    [HttpPut("{id}")] 
    public async Task<IActionResult> UpdateUser(int id, [FromBody] Enterprise.ALM.Domain.Entities.User updatedData)
    {
        var roleId = User.FindFirst("RoleId")?.Value;
        if (roleId != "1") 
        {
            return Forbid(); // Kicks them out with a 403 Forbidden error
        }

        var existingUser = await _context.Users.FindAsync(id);

        if (existingUser == null)
        {
            return NotFound();
        }

        // Existing core fields
        existingUser.Username = updatedData.Username;
        existingUser.Email = updatedData.Email;
        existingUser.Department = updatedData.Department;
        existingUser.IsActive = updatedData.IsActive;
        
        // Existing RoleId logic
        if (updatedData.RoleId != 0)
        {
            existingUser.RoleId = updatedData.RoleId;
        }

        await _context.SaveChangesAsync();

        return NoContent();
    }


}