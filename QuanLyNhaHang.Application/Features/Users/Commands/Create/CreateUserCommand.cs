using MediatR;

namespace QuanLyNhaHang.Application.Features.Users.Commands.Create;

public class CreateUserCommand : IRequest<Guid>
{
    public string? Ho { get; set; }

    public string Ten { get; set; } = default!;

    public string Email { get; set; } = string.Empty;

    public string PhoneNumber { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;
}