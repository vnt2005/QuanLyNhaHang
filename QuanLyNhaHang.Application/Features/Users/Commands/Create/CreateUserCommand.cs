using MediatR;

namespace QuanLyNhaHang.Application.Features.Users.Commands.Create;

public class CreateUserCommand : IRequest<Guid>
{
    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string PhoneNumber { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;
}