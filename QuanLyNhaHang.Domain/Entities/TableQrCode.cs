namespace QuanLyNhaHang.Domain.Entities;

public class TableQrCode
{
    public Guid Id { get; private set; }

    public Guid RestaurantTableId { get; private set; }

    public string Token { get; private set; } = string.Empty;

    public string QrCodeUrl { get; private set; } = string.Empty;

    public string Status { get; private set; } = string.Empty;

    public string? Note { get; private set; }

    public bool IsActive { get; private set; }

    public DateTime CreatedAt { get; private set; }

    public DateTime? UpdatedAt { get; private set; }

    protected TableQrCode()
    {
    }

    public TableQrCode(
        Guid restaurantTableId,
        string token,
        string qrCodeUrl,
        string? note)
    {
        Id = Guid.NewGuid();

        SetRestaurantTableId(restaurantTableId);
        SetToken(token);
        SetQrCodeUrl(qrCodeUrl);
        SetNote(note);

        Status = "Active";
        IsActive = true;
        CreatedAt = DateTime.UtcNow;
    }

    public void Regenerate(
        string token,
        string qrCodeUrl,
        string? note)
    {
        SetToken(token);
        SetQrCodeUrl(qrCodeUrl);
        SetNote(note);

        Status = "Active";
        IsActive = true;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateInfo(string? note)
    {
        SetNote(note);
        UpdatedAt = DateTime.UtcNow;
    }

    public void Activate()
    {
        Status = "Active";
        IsActive = true;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Deactivate()
    {
        Status = "Inactive";
        IsActive = false;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Block()
    {
        Status = "Blocked";
        IsActive = false;
        UpdatedAt = DateTime.UtcNow;
    }

    private void SetRestaurantTableId(Guid restaurantTableId)
    {
        if (restaurantTableId == Guid.Empty)
            throw new ArgumentException("Bàn không hợp lệ.");

        RestaurantTableId = restaurantTableId;
    }

    private void SetToken(string token)
    {
        if (string.IsNullOrWhiteSpace(token))
            throw new ArgumentException("Token QR không được để trống.");

        Token = token.Trim();
    }

    private void SetQrCodeUrl(string qrCodeUrl)
    {
        if (string.IsNullOrWhiteSpace(qrCodeUrl))
            throw new ArgumentException("Đường dẫn QR không được để trống.");

        QrCodeUrl = qrCodeUrl.Trim();
    }

    private void SetNote(string? note)
    {
        Note = string.IsNullOrWhiteSpace(note)
            ? null
            : note.Trim();
    }
}