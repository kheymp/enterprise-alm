using Enterprise.ALM.Application.DTOs.User;
using Enterprise.ALM.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Enterprise.ALM.Api.Controllers;


[ApiController]       
[Route("api/[controller]")]
[Authorize]

public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService) {
        _userService = userService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllUsers()
    {
        var users = await _userService.GetAllUsersAsync();

        return Ok(users);
    }

    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto)
    {
        var roleId = User.FindFirst("RoleId")?.Value;
        if (roleId != "1") return Forbid();

        var result = await _userService.CreateUserAsync(dto);
        return Ok(result);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var roleId = User.FindFirst("RoleId")?.Value;
        if (roleId != "1") return Forbid();

        var deleted = await _userService.DeleteUserAsync(id);
        if (!deleted) return NotFound();

        return NoContent();
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserDto dto)
    {
        var roleId = User.FindFirst("RoleId")?.Value;
        if (roleId != "1") return Forbid();
        
        var updated = await _userService.UpdateUserAsync(id, dto);
        if (!updated) return NotFound();
        return NoContent();
    }
}