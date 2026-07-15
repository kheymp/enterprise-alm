using Enterprise.ALM.Application.DTOs.Auth;
using Enterprise.ALM.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;


namespace Enterprise.ALM.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        // FOR CREATING NEW ADMINS AND USERS SAFELY
        [HttpPost("register")]
        //[Authorize(Roles = "Admin")]
        public async Task<IActionResult> Register([FromBody] RegisterRequestDto request)
        {
            var success = await _authService.RegisterAsync(request);
            if (!success) return BadRequest("Email already exists.");
            return Ok("User registered successfully.");
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
        {
            var result = await _authService.LoginAsync(request);
            if (result == null) return Unauthorized("Invalid email or password.");
            return Ok(result);
        }
    }
}