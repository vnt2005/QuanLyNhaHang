using MediatR;

namespace QuanLyNhaHang.Application.Features.Employees.Commands.Create;

public class CreateEmployeeCommand : IRequest<Guid>
{
    public string EmployeeCode { get; set; } = string.Empty;

    public string? Ho { get; set; }

    public string Ten { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string PhoneNumber { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;

    public DateTime? DateOfBirth { get; set; }

    public string? Address { get; set; }

    public string Position { get; set; } = string.Empty;

    public decimal BaseSalary { get; set; }

    public DateTime HireDate { get; set; }
}