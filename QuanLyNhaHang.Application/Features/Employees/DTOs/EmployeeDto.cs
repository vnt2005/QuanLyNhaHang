namespace QuanLyNhaHang.Application.Features.Employees.DTOs;

public class EmployeeDto
{
    public Guid Id { get; set; }

    public Guid? UserId { get; set; }

    public string? Role { get; set; }

    public bool? AccountIsActive { get; set; }
    public string EmployeeCode { get; set; } = string.Empty;

    public string? Ho { get; set; }

    public string Ten { get; set; } = string.Empty;

    public string? Email { get; set; }

    public string PhoneNumber { get; set; } = string.Empty;

    public DateTime? DateOfBirth { get; set; }

    public string? Address { get; set; }

    public string Position { get; set; } = string.Empty;

    public decimal BaseSalary { get; set; }

    public DateTime HireDate { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}