namespace QuanLyNhaHang.Domain.Entities;

public class Promotion
{
    public Guid Id { get; private set; }

    public string PromotionCode { get; private set; } = string.Empty;

    public string Name { get; private set; } = string.Empty;

    public string? Description { get; private set; }

    public string DiscountType { get; private set; } = string.Empty;

    public decimal DiscountValue { get; private set; }

    public decimal MinimumOrderAmount { get; private set; }

    public decimal? MaximumDiscountAmount { get; private set; }

    public DateTime StartDate { get; private set; }

    public DateTime EndDate { get; private set; }

    public int? UsageLimit { get; private set; }

    public int UsedCount { get; private set; }

    public bool IsActive { get; private set; }

    public DateTime CreatedAt { get; private set; }

    public DateTime? UpdatedAt { get; private set; }

    protected Promotion()
    {
    }

    public Promotion(
        string promotionCode,
        string name,
        string? description,
        string discountType,
        decimal discountValue,
        decimal minimumOrderAmount,
        decimal? maximumDiscountAmount,
        DateTime startDate,
        DateTime endDate,
        int? usageLimit)
    {
        Id = Guid.NewGuid();

        SetPromotionCode(promotionCode);
        SetName(name);
        SetDescription(description);
        SetDiscountType(discountType);
        SetDiscountValue(discountValue);
        SetMinimumOrderAmount(minimumOrderAmount);
        SetMaximumDiscountAmount(maximumDiscountAmount);
        SetDateRange(startDate, endDate);
        SetUsageLimit(usageLimit);

        UsedCount = 0;
        IsActive = true;
        CreatedAt = DateTime.UtcNow;
    }

    public void UpdateInfo(
        string name,
        string? description,
        string discountType,
        decimal discountValue,
        decimal minimumOrderAmount,
        decimal? maximumDiscountAmount,
        DateTime startDate,
        DateTime endDate,
        int? usageLimit)
    {
        SetName(name);
        SetDescription(description);
        SetDiscountType(discountType);
        SetDiscountValue(discountValue);
        SetMinimumOrderAmount(minimumOrderAmount);
        SetMaximumDiscountAmount(maximumDiscountAmount);
        SetDateRange(startDate, endDate);
        SetUsageLimit(usageLimit);

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

    public void IncreaseUsedCount()
    {
        if (UsageLimit.HasValue && UsedCount >= UsageLimit.Value)
            throw new InvalidOperationException("Mã khuyến mãi đã đạt giới hạn sử dụng.");

        UsedCount++;
        UpdatedAt = DateTime.UtcNow;
    }

    public void DecreaseUsedCount()
    {
        if (UsedCount <= 0)
            return;

        UsedCount--;
        UpdatedAt = DateTime.UtcNow;
    }

    public decimal CalculateDiscountAmount(decimal orderAmount)
    {
        if (!IsActive)
            throw new InvalidOperationException("Mã khuyến mãi đã bị vô hiệu hóa.");

        var now = DateTime.UtcNow;

        if (now < StartDate || now > EndDate)
            throw new InvalidOperationException("Mã khuyến mãi không nằm trong thời gian áp dụng.");

        if (UsageLimit.HasValue && UsedCount >= UsageLimit.Value)
            throw new InvalidOperationException("Mã khuyến mãi đã đạt giới hạn sử dụng.");

        if (orderAmount < MinimumOrderAmount)
            throw new InvalidOperationException("Đơn hàng chưa đạt giá trị tối thiểu để áp dụng khuyến mãi.");

        decimal discountAmount;

        if (DiscountType == "Percent")
        {
            discountAmount = orderAmount * DiscountValue / 100;
        }
        else if (DiscountType == "Amount")
        {
            discountAmount = DiscountValue;
        }
        else
        {
            throw new InvalidOperationException("Loại giảm giá không hợp lệ.");
        }

        if (MaximumDiscountAmount.HasValue && discountAmount > MaximumDiscountAmount.Value)
        {
            discountAmount = MaximumDiscountAmount.Value;
        }

        if (discountAmount > orderAmount)
        {
            discountAmount = orderAmount;
        }

        return discountAmount;
    }

    private void SetPromotionCode(string promotionCode)
    {
        if (string.IsNullOrWhiteSpace(promotionCode))
            throw new ArgumentException("Mã khuyến mãi không được để trống.");

        PromotionCode = promotionCode.Trim().ToUpper();
    }

    private void SetName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Tên khuyến mãi không được để trống.");

        Name = name.Trim();
    }

    private void SetDescription(string? description)
    {
        Description = string.IsNullOrWhiteSpace(description)
            ? null
            : description.Trim();
    }

    private void SetDiscountType(string discountType)
    {
        if (string.IsNullOrWhiteSpace(discountType))
            throw new ArgumentException("Loại giảm giá không được để trống.");

        discountType = discountType.Trim();

        var validTypes = new[] { "Percent", "Amount" };

        if (!validTypes.Contains(discountType))
            throw new ArgumentException("Loại giảm giá không hợp lệ. Chỉ được dùng Percent hoặc Amount.");

        DiscountType = discountType;
    }

    private void SetDiscountValue(decimal discountValue)
    {
        if (discountValue <= 0)
            throw new ArgumentException("Giá trị giảm giá phải lớn hơn 0.");

        if (DiscountType == "Percent" && discountValue > 100)
            throw new ArgumentException("Giảm giá phần trăm không được lớn hơn 100.");

        DiscountValue = discountValue;
    }

    private void SetMinimumOrderAmount(decimal minimumOrderAmount)
    {
        if (minimumOrderAmount < 0)
            throw new ArgumentException("Giá trị đơn hàng tối thiểu không được nhỏ hơn 0.");

        MinimumOrderAmount = minimumOrderAmount;
    }

    private void SetMaximumDiscountAmount(decimal? maximumDiscountAmount)
    {
        if (maximumDiscountAmount.HasValue && maximumDiscountAmount.Value < 0)
            throw new ArgumentException("Số tiền giảm tối đa không được nhỏ hơn 0.");

        MaximumDiscountAmount = maximumDiscountAmount;
    }

    private void SetDateRange(DateTime startDate, DateTime endDate)
    {
        if (endDate < startDate)
            throw new ArgumentException("Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.");

        StartDate = startDate;
        EndDate = endDate;
    }

    private void SetUsageLimit(int? usageLimit)
    {
        if (usageLimit.HasValue && usageLimit.Value <= 0)
            throw new ArgumentException("Giới hạn sử dụng phải lớn hơn 0.");

        UsageLimit = usageLimit;
    }
}