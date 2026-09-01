namespace QuanLyNhaHang.Domain.Entities;

public class RestaurantSetting
{
    public Guid Id { get; private set; }

    public string RestaurantName { get; private set; } = string.Empty;

    public string Address { get; private set; } = string.Empty;

    public string PhoneNumber { get; private set; } = string.Empty;

    public string? Email { get; private set; }

    public string? TaxCode { get; private set; }

    public string? WebsiteUrl { get; private set; }

    public string? LogoUrl { get; private set; }

    public decimal DefaultVatPercent { get; private set; }

    public decimal ServiceChargePercent { get; private set; }

    public string Currency { get; private set; } = string.Empty;

    public string OpeningTime { get; private set; } = string.Empty;

    public string ClosingTime { get; private set; } = string.Empty;

    public string? InvoiceFooter { get; private set; }

    public string? QrOrderWelcomeMessage { get; private set; }

    public bool AiAssistantEnabled { get; private set; }

    public string AiAssistantModel { get; private set; } = "gpt-5.6-luna";

    public string? AiAssistantWelcomeMessage { get; private set; }

    public string? AiAssistantSystemPrompt { get; private set; }

    public string? AiAssistantKnowledgeBase { get; private set; }

    public string? AiAssistantSuggestedQuestions { get; private set; }

    public int AiAssistantMaxOutputTokens { get; private set; } = 500;

    public bool IsActive { get; private set; }

    public DateTime CreatedAt { get; private set; }

    public DateTime? UpdatedAt { get; private set; }

    protected RestaurantSetting()
    {
    }

    public RestaurantSetting(
        string restaurantName,
        string address,
        string phoneNumber,
        string? email,
        string? taxCode,
        string? websiteUrl,
        string? logoUrl,
        decimal defaultVatPercent,
        decimal serviceChargePercent,
        string currency,
        string openingTime,
        string closingTime,
        string? invoiceFooter,
        string? qrOrderWelcomeMessage)
    {
        Id = Guid.NewGuid();

        SetRestaurantName(restaurantName);
        SetAddress(address);
        SetPhoneNumber(phoneNumber);
        SetEmail(email);
        SetTaxCode(taxCode);
        SetWebsiteUrl(websiteUrl);
        SetLogoUrl(logoUrl);
        SetDefaultVatPercent(defaultVatPercent);
        SetServiceChargePercent(serviceChargePercent);
        SetCurrency(currency);
        SetOpeningTime(openingTime);
        SetClosingTime(closingTime);
        SetInvoiceFooter(invoiceFooter);
        SetQrOrderWelcomeMessage(qrOrderWelcomeMessage);

        AiAssistantEnabled = false;
        AiAssistantModel = "gpt-5.6-luna";
        AiAssistantWelcomeMessage = "Xin chào! Tôi là trợ lý AI của nhà hàng. Tôi có thể gợi ý món, giải đáp về thực đơn, khuyến mãi và cách đặt bàn.";
        AiAssistantSystemPrompt = "Bạn là trợ lý chăm sóc khách hàng của nhà hàng. Chỉ trả lời trong phạm vi thông tin nhà hàng được cung cấp; nếu không chắc, hãy nói rõ và hướng khách liên hệ nhân viên. Không tự bịa giá, khuyến mãi, trạng thái đơn hàng hay chính sách.";
        AiAssistantSuggestedQuestions = "Hôm nay có món gì nổi bật?\nCó khuyến mãi nào đang áp dụng?\nTôi muốn đặt bàn thì làm thế nào?";
        AiAssistantMaxOutputTokens = 500;

        IsActive = true;
        CreatedAt = DateTime.UtcNow;
    }

    public void UpdateInfo(
        string restaurantName,
        string address,
        string phoneNumber,
        string? email,
        string? taxCode,
        string? websiteUrl,
        string? logoUrl,
        decimal defaultVatPercent,
        decimal serviceChargePercent,
        string currency,
        string openingTime,
        string closingTime,
        string? invoiceFooter,
        string? qrOrderWelcomeMessage)
    {
        SetRestaurantName(restaurantName);
        SetAddress(address);
        SetPhoneNumber(phoneNumber);
        SetEmail(email);
        SetTaxCode(taxCode);
        SetWebsiteUrl(websiteUrl);
        SetLogoUrl(logoUrl);
        SetDefaultVatPercent(defaultVatPercent);
        SetServiceChargePercent(serviceChargePercent);
        SetCurrency(currency);
        SetOpeningTime(openingTime);
        SetClosingTime(closingTime);
        SetInvoiceFooter(invoiceFooter);
        SetQrOrderWelcomeMessage(qrOrderWelcomeMessage);

        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateAiAssistant(
        bool enabled,
        string model,
        string? welcomeMessage,
        string? systemPrompt,
        string? knowledgeBase,
        string? suggestedQuestions,
        int maxOutputTokens)
    {
        if (string.IsNullOrWhiteSpace(model))
            throw new ArgumentException("Model AI không được để trống.");

        if (maxOutputTokens is < 100 or > 2000)
            throw new ArgumentException("Số token đầu ra của AI phải nằm trong khoảng 100 đến 2000.");

        AiAssistantEnabled = enabled;
        AiAssistantModel = model.Trim();
        AiAssistantWelcomeMessage = NormalizeOptional(welcomeMessage);
        AiAssistantSystemPrompt = NormalizeOptional(systemPrompt);
        AiAssistantKnowledgeBase = NormalizeOptional(knowledgeBase);
        AiAssistantSuggestedQuestions = NormalizeOptional(suggestedQuestions);
        AiAssistantMaxOutputTokens = maxOutputTokens;
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

    private void SetRestaurantName(string restaurantName)
    {
        if (string.IsNullOrWhiteSpace(restaurantName))
            throw new ArgumentException("Tên nhà hàng không được để trống.");

        RestaurantName = restaurantName.Trim();
    }

    private void SetAddress(string address)
    {
        if (string.IsNullOrWhiteSpace(address))
            throw new ArgumentException("Địa chỉ nhà hàng không được để trống.");

        Address = address.Trim();
    }

    private void SetPhoneNumber(string phoneNumber)
    {
        if (string.IsNullOrWhiteSpace(phoneNumber))
            throw new ArgumentException("Số điện thoại nhà hàng không được để trống.");

        PhoneNumber = phoneNumber.Trim();
    }

    private void SetEmail(string? email)
    {
        Email = string.IsNullOrWhiteSpace(email)
            ? null
            : email.Trim().ToLower();
    }

    private void SetTaxCode(string? taxCode)
    {
        TaxCode = string.IsNullOrWhiteSpace(taxCode)
            ? null
            : taxCode.Trim();
    }

    private void SetWebsiteUrl(string? websiteUrl)
    {
        WebsiteUrl = string.IsNullOrWhiteSpace(websiteUrl)
            ? null
            : websiteUrl.Trim();
    }

    private void SetLogoUrl(string? logoUrl)
    {
        LogoUrl = string.IsNullOrWhiteSpace(logoUrl)
            ? null
            : logoUrl.Trim();
    }

    private void SetDefaultVatPercent(decimal defaultVatPercent)
    {
        if (defaultVatPercent < 0 || defaultVatPercent > 100)
            throw new ArgumentException("VAT mặc định phải nằm trong khoảng 0 đến 100.");

        DefaultVatPercent = defaultVatPercent;
    }

    private void SetServiceChargePercent(decimal serviceChargePercent)
    {
        if (serviceChargePercent < 0 || serviceChargePercent > 100)
            throw new ArgumentException("Phí phục vụ phải nằm trong khoảng 0 đến 100.");

        ServiceChargePercent = serviceChargePercent;
    }

    private void SetCurrency(string currency)
    {
        if (string.IsNullOrWhiteSpace(currency))
            throw new ArgumentException("Đơn vị tiền tệ không được để trống.");

        Currency = currency.Trim().ToUpper();
    }

    private void SetOpeningTime(string openingTime)
    {
        if (string.IsNullOrWhiteSpace(openingTime))
            throw new ArgumentException("Giờ mở cửa không được để trống.");

        OpeningTime = openingTime.Trim();
    }

    private void SetClosingTime(string closingTime)
    {
        if (string.IsNullOrWhiteSpace(closingTime))
            throw new ArgumentException("Giờ đóng cửa không được để trống.");

        ClosingTime = closingTime.Trim();
    }

    private void SetInvoiceFooter(string? invoiceFooter)
    {
        InvoiceFooter = NormalizeOptional(invoiceFooter);
    }

    private void SetQrOrderWelcomeMessage(string? qrOrderWelcomeMessage)
    {
        QrOrderWelcomeMessage = NormalizeOptional(qrOrderWelcomeMessage);
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }
}
