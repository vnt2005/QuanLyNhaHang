namespace QuanLyNhaHang.Domain.Entities;

public class Employee
{
    public Guid Id { get; private set; }
    public Guid? UserId { get; private set; }

    public User? User { get; private set; }

    public string EmployeeCode { get; private set; } = string.Empty;

    public string? Ho { get; set; }

    public string Ten { get; set; } = default!;

    public string? Email { get; private set; }

    public string PhoneNumber { get; private set; } = string.Empty;

    public DateTime? DateOfBirth { get; private set; }

    public string? Address { get; private set; }

    public string Position { get; private set; } = string.Empty;

    public decimal BaseSalary { get; private set; }

    public DateTime HireDate { get; private set; }

    public bool IsActive { get; private set; }

    public DateTime CreatedAt { get; private set; }

    public DateTime? UpdatedAt { get; private set; }

    protected Employee()
    {
    }

    public Employee(
    Guid userId,
    string employeeCode,
    string? ho,
    string ten,
    string? email,
    string phoneNumber,
    DateTime? dateOfBirth,
    string? address,
    string position,
    decimal baseSalary,
    DateTime hireDate)
    {
        Id = Guid.NewGuid();

        LinkUser(userId);
        SetEmployeeCode(employeeCode);
        SetHo(ho);
        SetTen(ten);
        SetEmail(email);
        SetPhoneNumber(phoneNumber);
        SetDateOfBirth(dateOfBirth);
        SetAddress(address);
        SetPosition(position);
        SetBaseSalary(baseSalary);

        HireDate = hireDate;
        IsActive = true;
        CreatedAt = DateTime.UtcNow;
    }
    public void LinkUser(Guid userId)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("Tài khoản nhân viên không hợp lệ.");

        if (UserId.HasValue && UserId.Value != userId)
            throw new InvalidOperationException(
                "Nhân viên đã được liên kết với một tài khoản khác.");

        UserId = userId;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateInfo(
        string employeeCode,
        string? ho,
        string ten,
        string? email,
        string phoneNumber,
        DateTime? dateOfBirth,
        string? address,
        string position,
        decimal baseSalary,
        DateTime hireDate)
    {
        SetEmployeeCode(employeeCode);
        SetHo(ho);
        SetTen(ten);
        SetEmail(email);
        SetPhoneNumber(phoneNumber);
        SetDateOfBirth(dateOfBirth);
        SetAddress(address);
        SetPosition(position);
        SetBaseSalary(baseSalary);

        HireDate = hireDate;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Activate()
    {
        IsActive = true;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Deactivate()
    {
        IsActive = false;
        UpdatedAt = DateTime.UtcNow;
    }

    private void SetEmployeeCode(string employeeCode)
    {
        if (string.IsNullOrWhiteSpace(employeeCode))
            throw new ArgumentException("Mã nhân viên không được để trống.");

        EmployeeCode = employeeCode.Trim().ToUpper();
    }

    private void SetHo(string? ho)
    {
        Ho = string.IsNullOrWhiteSpace(ho) ? null : ho.Trim();
    }

    private void SetTen(string ten)
    {
        if (string.IsNullOrWhiteSpace(ten))
            throw new ArgumentException("Tên nhân viên không được để trống.");

        Ten = ten.Trim();
    }

    private void SetEmail(string? email)
    {
        Email = string.IsNullOrWhiteSpace(email)
            ? null
            : email.Trim().ToLower();
    }

    private void SetPhoneNumber(string phoneNumber)
    {
        if (string.IsNullOrWhiteSpace(phoneNumber))
            throw new ArgumentException("Số điện thoại không được để trống.");

        PhoneNumber = phoneNumber.Trim();
    }

    private void SetDateOfBirth(DateTime? dateOfBirth)
    {
        if (dateOfBirth.HasValue && dateOfBirth.Value.Date > DateTime.UtcNow.Date)
            throw new ArgumentException("Ngày sinh không hợp lệ.");

        DateOfBirth = dateOfBirth;
    }

    private void SetAddress(string? address)
    {
        Address = string.IsNullOrWhiteSpace(address) ? null : address.Trim();
    }

    private void SetPosition(string position)
    {
        if (string.IsNullOrWhiteSpace(position))
            throw new ArgumentException("Chức vụ không được để trống.");

        Position = position.Trim();
    }

    private void SetBaseSalary(decimal baseSalary)
    {
        if (baseSalary < 0)
            throw new ArgumentException("Lương cơ bản không được nhỏ hơn 0.");

        BaseSalary = baseSalary;
    }
}