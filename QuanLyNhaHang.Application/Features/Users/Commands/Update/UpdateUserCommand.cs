using MediatR;

namespace QuanLyNhaHang.Application.Features.Users.Commands.Update;

public class UpdateUserCommand : IRequest<bool>
{
    public Guid Id { get; set; }
    public string? Ho { get; set; }
    public string Ten { get; set; } = default!;
    public string Email { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}