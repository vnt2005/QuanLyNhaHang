using System.Globalization;
using System.Text;

namespace QuanLyNhaHang.Application.Features.AiAssistant;

public static class AiAssistantToolNames
{
    public const string RestaurantInfo = "get_restaurant_info";
    public const string PaymentOptions = "get_payment_options";
    public const string SearchMenu = "search_menu";
    public const string ActivePromotions = "get_active_promotions";
    public const string TableAvailability = "get_table_availability";
    public const string WebsiteCapabilities = "get_website_capabilities";
    public const string MyOrders = "get_my_orders";
    public const string MyNotifications = "get_my_notifications";
    public const string AdminOverview = "get_admin_overview";
    public const string AdminModuleData = "get_admin_module_data";
}

public sealed record AiAssistantIntentRoute(
    string Intent,
    string ToolName,
    string DataSource,
    string? RequiredModule = null)
{
    public string ToPromptInstruction()
    {
        var arguments = RequiredModule is null
            ? string.Empty
            : $" với tham số module=\"{RequiredModule}\"";

        return $"- Intent `{Intent}`: BẮT BUỘC gọi `{ToolName}`{arguments}. " +
               $"Nguồn nghiệp vụ: {DataSource}.";
    }
}

/// <summary>
/// Deterministic routing guard for common restaurant questions. It does not
/// answer questions or access data; it only constrains Gemini to the correct
/// read-only tool for intents where guessing would be unsafe or inaccurate.
/// </summary>
public static class AiAssistantBusinessIntentCatalog
{
    private const string PaymentSource =
        "PaymentMethodCatalog + IPaymentGateway + IPaymentChannelReadiness";

    public static IReadOnlyList<AiAssistantIntentRoute> ResolveCustomer(
        string? message,
        bool authenticated)
    {
        var text = Normalize(message);
        if (text.Length == 0)
            return [];

        var routes = new List<AiAssistantIntentRoute>();
        var asksAboutOwnOrder = IsPersonalOrderQuestion(text);

        if (asksAboutOwnOrder)
        {
            Add(
                routes,
                authenticated ? "customer_order_status" : "customer_login_for_private_order",
                authenticated ? AiAssistantToolNames.MyOrders : AiAssistantToolNames.WebsiteCapabilities,
                authenticated
                    ? "Orders + OrderItems + Payments + PaymentAttempts + Invoices, lọc theo CustomerUserId hiện tại"
                    : "Danh mục chức năng CustomerWeb; không truy vấn dữ liệu riêng khi chưa đăng nhập");
        }

        if (!asksAboutOwnOrder && IsPaymentMethodQuestion(text))
        {
            Add(
                routes,
                "payment_methods",
                AiAssistantToolNames.PaymentOptions,
                PaymentSource);
        }

        if (ContainsAny(text, "thuc don", "menu", "mon an", "mon nao", "gia mon", "do an"))
        {
            Add(
                routes,
                "menu",
                AiAssistantToolNames.SearchMenu,
                "MenuItems + MenuCategories");
        }

        if (ContainsAny(text, "khuyen mai", "ma giam", "giam gia", "uu dai", "voucher"))
        {
            Add(
                routes,
                "promotions",
                AiAssistantToolNames.ActivePromotions,
                "Promotions");
        }

        if (ContainsAny(
                text,
                "dat ban",
                "ban trong",
                "con ban",
                "ban cho",
                "cho ngoi",
                "khu vuc ngoi",
                "giu ban"))
        {
            Add(
                routes,
                "table_availability",
                AiAssistantToolNames.TableAvailability,
                "RestaurantTables + Areas + Reservations");
        }

        if (ContainsAny(
                text,
                "mo cua",
                "dong cua",
                "gio mo cua",
                "may gio mo",
                "may gio dong",
                "dong cua luc",
                "dia chi",
                "so dien thoai",
                "lien he",
                "phi phuc vu",
                "thue vat",
                "vat bao nhieu"))
        {
            Add(
                routes,
                "restaurant_information",
                AiAssistantToolNames.RestaurantInfo,
                "RestaurantSettings + Areas + RestaurantTables");
        }

        if (ContainsAny(text, "thong bao cua toi", "thong bao moi", "toi co thong bao"))
        {
            Add(
                routes,
                authenticated ? "customer_notifications" : "customer_login_for_notifications",
                authenticated ? AiAssistantToolNames.MyNotifications : AiAssistantToolNames.WebsiteCapabilities,
                authenticated
                    ? "Notifications, lọc theo UserId hiện tại"
                    : "Danh mục chức năng CustomerWeb; không truy vấn thông báo riêng khi chưa đăng nhập");
        }

        if (routes.Count == 0 && ContainsAny(
                text,
                "cach dat mon",
                "cach thanh toan",
                "cach dat ban",
                "website lam duoc gi",
                "trang nao"))
        {
            Add(
                routes,
                "customer_web_capabilities",
                AiAssistantToolNames.WebsiteCapabilities,
                "Danh mục chức năng CustomerWeb");
        }

        return routes;
    }

    public static IReadOnlyList<AiAssistantIntentRoute> ResolveAdmin(string? message)
    {
        var text = Normalize(message);
        if (text.Length == 0)
            return [];

        var routes = new List<AiAssistantIntentRoute>();
        var paymentMethods = IsPaymentMethodQuestion(text);

        if (paymentMethods)
        {
            Add(
                routes,
                "payment_methods",
                AiAssistantToolNames.PaymentOptions,
                PaymentSource + " + Payments (thống kê phương thức đã dùng)");
        }

        if (ContainsAny(text, "hoa don", "invoice"))
        {
            AddAdminModule(routes, "invoices", "invoices", "Invoices");
        }

        if (ContainsAny(text, "doanh thu", "bao cao thu", "tong thu", "revenue"))
        {
            AddAdminModule(
                routes,
                "revenue",
                "revenue",
                "Payments trạng thái Paid + RevenueReports");
        }

        if (ContainsAny(text, "ton kho", "sap het", "nguyen lieu", "nhap kho", "xuat kho", "inventory"))
        {
            AddAdminModule(
                routes,
                "inventory",
                "inventory",
                "Ingredients + InventoryTransactions");
        }

        if (ContainsAny(text, "thuc don", "menu", "mon an", "gia mon", "mon dang ban"))
        {
            AddAdminModule(routes, "menu", "menu", "MenuItems + MenuCategories");
        }

        if (ContainsAny(text, "khuyen mai", "ma giam", "uu dai", "voucher"))
        {
            AddAdminModule(routes, "promotions", "promotions", "Promotions");
        }

        if (ContainsAny(text, "dat ban", "lich dat", "reservation"))
        {
            AddAdminModule(routes, "reservations", "reservations", "Reservations");
        }
        else if (ContainsAny(
                     text,
                     "ban trong",
                     "con ban",
                     "trang thai ban",
                     "khu vuc ban",
                     "danh sach ban"))
        {
            AddAdminModule(routes, "tables", "tables", "RestaurantTables + Areas");
        }

        if (ContainsAny(text, "trang thai don", "don hang", "ma don", "don nao", "order"))
        {
            AddAdminModule(routes, "orders", "orders", "Orders + OrderItems");
        }

        if (ContainsAny(text, "bep", "dang nau", "cho nau", "kitchen"))
        {
            AddAdminModule(routes, "kitchen", "kitchen", "OrderItems");
        }

        if (!paymentMethods && ContainsAny(
                text,
                "thanh toan",
                "giao dich",
                "sepay",
                "doi soat",
                "payment"))
        {
            AddAdminModule(
                routes,
                "payments",
                "payments",
                "Payments + PaymentAttempts");
        }

        if (ContainsAny(
                text,
                "mo cua",
                "dong cua",
                "gio mo cua",
                "gio dong cua",
                "cau hinh nha hang",
                "phi phuc vu",
                "thue vat",
                "vat bao nhieu"))
        {
            AddAdminModule(
                routes,
                "restaurant_settings",
                "restaurant_settings",
                "RestaurantSettings");
        }

        if (ContainsAny(text, "nhat ky", "lich su thao tac", "activity log"))
        {
            AddAdminModule(routes, "activity_logs", "activity_logs", "ActivityLogs");
        }

        if (ContainsAny(text, "thong bao", "notification"))
        {
            AddAdminModule(routes, "notifications", "notifications", "Notifications");
        }

        if (routes.Count == 0 && ContainsAny(
                text,
                "tong quan",
                "tinh hinh nha hang",
                "hom nay the nao",
                "dashboard"))
        {
            Add(
                routes,
                "admin_overview",
                AiAssistantToolNames.AdminOverview,
                "Các bảng vận hành tổng hợp, chỉ đọc");
        }

        return routes;
    }

    public static string BuildRoutingDirective(
        IReadOnlyList<AiAssistantIntentRoute> routes)
    {
        if (routes.Count == 0)
            return string.Empty;

        return "\n\nĐỊNH TUYẾN NGHIỆP VỤ BẮT BUỘC CHO CÂU HỎI HIỆN TẠI:\n" +
               string.Join('\n', routes.Select(route => route.ToPromptInstruction())) +
               "\nKhông được trả lời các intent trên bằng trí nhớ hoặc suy đoán trước khi nhận kết quả tool.";
    }

    private static bool IsPersonalOrderQuestion(string text)
    {
        return ContainsAny(
                   text,
                   "don cua toi",
                   "don hang cua toi",
                   "ma don",
                   "trang thai don",
                   "mon cua toi",
                   "hoa don cua toi",
                   "hoa don don cua toi",
                   "thanh toan cua toi",
                   "trang thai thanh toan",
                   "da thanh toan chua")
               || (text.Contains("don hang", StringComparison.Ordinal)
                   && ContainsAny(text, "cua minh", "toi dat", "toi mua"));
    }

    private static bool IsPaymentMethodQuestion(string text)
    {
        if (ContainsAny(
                text,
                "phuong thuc thanh toan",
                "hinh thuc thanh toan",
                "cach thanh toan nao",
                "thanh toan bang gi",
                "thanh toan duoc bang gi",
                "co the thanh toan bang",
                "thanh toan nao",
                "tra tien bang gi",
                "tra bang gi",
                "tra bang the",
                "ho tro thanh toan",
                "chap nhan thanh toan",
                "nhan thanh toan nao",
                "co chuyen khoan",
                "nhan chuyen khoan"))
        {
            return true;
        }

        var mentionsMethod = ContainsAny(
            text,
            "tien mat",
            "chuyen khoan",
            "quet qr",
            "the ngan hang",
            "vi dien tu",
            "momo",
            "zalopay");

        return mentionsMethod
               && ContainsAny(text, "thanh toan", "tra tien", "co nhan", "co ho tro", "duoc khong");
    }

    private static void AddAdminModule(
        ICollection<AiAssistantIntentRoute> routes,
        string intent,
        string module,
        string dataSource)
    {
        Add(
            routes,
            intent,
            AiAssistantToolNames.AdminModuleData,
            dataSource,
            module);
    }

    private static void Add(
        ICollection<AiAssistantIntentRoute> routes,
        string intent,
        string toolName,
        string dataSource,
        string? requiredModule = null)
    {
        if (routes.Any(route => route.ToolName == toolName
                                && route.RequiredModule == requiredModule))
        {
            return;
        }

        routes.Add(new AiAssistantIntentRoute(
            intent,
            toolName,
            dataSource,
            requiredModule));
    }

    private static bool ContainsAny(string text, params string[] values)
        => values.Any(value => text.Contains(value, StringComparison.Ordinal));

    private static string Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return string.Empty;

        var decomposed = value.Trim().ToLowerInvariant()
            .Replace('đ', 'd')
            .Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(decomposed.Length);
        var previousWasSpace = true;

        foreach (var character in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) == UnicodeCategory.NonSpacingMark)
                continue;

            if (char.IsLetterOrDigit(character))
            {
                builder.Append(character);
                previousWasSpace = false;
            }
            else if (!previousWasSpace)
            {
                builder.Append(' ');
                previousWasSpace = true;
            }
        }

        return builder.ToString().Trim();
    }
}
