using MediatR;

namespace QuanLyNhaHang.Application.Features.Employees.Commands.Update;

public class UpdateEmployeeCommand : IRequest<bool>
{
    public Guid Id { get; set; }

    public string EmployeeCode { get; set; } = string.Empty;

    public string? Ho { get; set; }

    public string Ten { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string PhoneNumber { get; set; } = string.Empty;

    // Để trống nếu không muốn đổi mật khẩu.
    // Nhân viên cũ chưa có User thì bắt buộc nhập.
    public string? Password { get; set; }

    public string Role { get; set; } = string.Empty;

    public DateTime? DateOfBirth { get; set; }

    public string? Address { get; set; }

    public string Position { get; set; } = string.Empty;

    public decimal BaseSalary { get; set; }

    public DateTime HireDate { get; set; }

    public bool IsActive { get; set; }
}