using QuanLyNhaHang.Application.Features.AiAssistant;
using QuanLyNhaHang.Domain.Payments;
using Xunit;

namespace QuanLyNhaHang.UnitTests.Application;

public class AiAssistantBusinessQuestionRegressionTests
{
    public static TheoryData<string, string, string?> CustomerQuestions => new()
    {
        {
            "Nhà hàng có các phương thức thanh toán nào?",
            AiAssistantToolNames.PaymentOptions,
            null
        },
        {
            "Cho tôi xem thực đơn và giá món đang bán.",
            AiAssistantToolNames.SearchMenu,
            null
        },
        {
            "Còn bàn cho 4 người lúc 19 giờ không?",
            AiAssistantToolNames.TableAvailability,
            null
        },
        {
            "Hôm nay có mã khuyến mãi nào?",
            AiAssistantToolNames.ActivePromotions,
            null
        },
        {
            "Nhà hàng mở cửa mấy giờ?",
            AiAssistantToolNames.RestaurantInfo,
            null
        },
        {
            "Đơn của tôi đang ở trạng thái nào?",
            AiAssistantToolNames.MyOrders,
            null
        },
        {
            "Hóa đơn của tôi đã có chưa?",
            AiAssistantToolNames.MyOrders,
            null
        }
    };

    public static TheoryData<string, string, string?> AdminQuestions => new()
    {
        {
            "Tình hình vận hành hôm nay thế nào?",
            AiAssistantToolNames.AdminOverview,
            null
        },
        {
            "Nhà hàng có các phương thức thanh toán nào?",
            AiAssistantToolNames.PaymentOptions,
            null
        },
        {
            "Thực đơn hiện có những món nào đang bán?",
            AiAssistantToolNames.AdminModuleData,
            "menu"
        },
        {
            "Còn bao nhiêu bàn trống?",
            AiAssistantToolNames.AdminModuleData,
            "tables"
        },
        {
            "Khuyến mãi nào đang hoạt động?",
            AiAssistantToolNames.AdminModuleData,
            "promotions"
        },
        {
            "Nhà hàng mở cửa lúc mấy giờ?",
            AiAssistantToolNames.AdminModuleData,
            "restaurant_settings"
        },
        {
            "Trạng thái đơn hàng hôm nay thế nào?",
            AiAssistantToolNames.AdminModuleData,
            "orders"
        },
        {
            "Có bao nhiêu hóa đơn đã phát hành?",
            AiAssistantToolNames.AdminModuleData,
            "invoices"
        },
        {
            "Doanh thu hôm nay là bao nhiêu?",
            AiAssistantToolNames.AdminModuleData,
            "revenue"
        },
        {
            "Nguyên liệu nào sắp hết trong tồn kho?",
            AiAssistantToolNames.AdminModuleData,
            "inventory"
        }
    };

    [Theory]
    [MemberData(nameof(CustomerQuestions))]
    public void CustomerQuestion_RoutesToExpectedReadOnlyTool(
        string question,
        string expectedTool,
        string? expectedModule)
    {
        var routes = AiAssistantBusinessIntentCatalog.ResolveCustomer(
            question,
            authenticated: true);

        Assert.Contains(
            routes,
            route => route.ToolName == expectedTool
                     && route.RequiredModule == expectedModule);
    }

    [Theory]
    [MemberData(nameof(AdminQuestions))]
    public void AdminQuestion_RoutesToExpectedReadOnlySource(
        string question,
        string expectedTool,
        string? expectedModule)
    {
        var routes = AiAssistantBusinessIntentCatalog.ResolveAdmin(question);

        Assert.Contains(
            routes,
            route => route.ToolName == expectedTool
                     && route.RequiredModule == expectedModule);
    }

    [Fact]
    public void AnonymousCustomer_PrivateOrderQuestion_RequiresLoginWithoutPrivateTool()
    {
        var routes = AiAssistantBusinessIntentCatalog.ResolveCustomer(
            "Đơn của tôi đã thanh toán chưa?",
            authenticated: false);

        Assert.Contains(
            routes,
            route => route.ToolName == AiAssistantToolNames.WebsiteCapabilities);
        Assert.DoesNotContain(
            routes,
            route => route.ToolName == AiAssistantToolNames.MyOrders);
    }

    [Fact]
    public void CustomerPrivateOrderRoute_DeclaresAccountIsolationSource()
    {
        var route = Assert.Single(
            AiAssistantBusinessIntentCatalog.ResolveCustomer(
                "Trạng thái đơn của tôi?",
                authenticated: true));

        Assert.Equal(AiAssistantToolNames.MyOrders, route.ToolName);
        Assert.True(route.DataSource.Contains("CustomerUserId", StringComparison.Ordinal));
    }

    [Fact]
    public void RegressionRoutes_OnlyUseReadOnlyToolNames()
    {
        var routes = new[]
            {
                "Nhà hàng có các phương thức thanh toán nào?",
                "Cho tôi xem thực đơn.",
                "Đơn của tôi đang ở trạng thái nào?"
            }
            .SelectMany(question => AiAssistantBusinessIntentCatalog.ResolveCustomer(
                question,
                authenticated: true))
            .Concat(new[]
            {
                "Doanh thu hôm nay là bao nhiêu?",
                "Nguyên liệu nào sắp hết trong tồn kho?",
                "Có bao nhiêu hóa đơn đã phát hành?"
            }.SelectMany(AiAssistantBusinessIntentCatalog.ResolveAdmin))
            .ToList();

        Assert.NotEmpty(routes);
        Assert.All(
            routes,
            route => Assert.True(
                route.ToolName.StartsWith("get_", StringComparison.Ordinal)
                || route.ToolName.StartsWith("search_", StringComparison.Ordinal)));
    }

    [Fact]
    public void PaymentCatalog_MatchesSupportedCounterAndCustomerWebFlows()
    {
        Assert.Equal(
            new[]
            {
                "BankTransfer", "Cash", "Card", "EWallet", "Momo", "ZaloPay", "Other"
            },
            PaymentMethodCatalog.All.Select(method => method.Code));
        Assert.All(
            PaymentMethodCatalog.All,
            method => Assert.True(method.AvailableAtCounter));

        var customerWebMethod = Assert.Single(
            PaymentMethodCatalog.All.Where(method => method.AvailableOnCustomerWeb));
        Assert.Equal(PaymentMethodCatalog.BankTransfer, customerWebMethod.Code);
    }

    [Fact]
    public void AdminRevenueRoute_BuildsExactModuleDirective()
    {
        var routes = AiAssistantBusinessIntentCatalog.ResolveAdmin(
            "Doanh thu hôm nay là bao nhiêu?");

        var directive = AiAssistantBusinessIntentCatalog.BuildRoutingDirective(routes);

        Assert.True(directive.Contains("get_admin_module_data", StringComparison.Ordinal));
        Assert.True(directive.Contains("module=\"revenue\"", StringComparison.Ordinal));
        Assert.True(directive.Contains("BẮT BUỘC", StringComparison.Ordinal));
    }
}
