using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.CustomerPayments.Services;
using QuanLyNhaHang.Application.Features.Promotions.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.CustomerPromotions;

public sealed record GetAppliedCustomerPromotionQuery(
    Guid OrderId,
    string? QrToken)
    : IRequest<ApplyPromotionResultDto?>;

public sealed record ApplyCustomerPromotionCommand(
    Guid OrderId,
    string PromotionCode,
    string? QrToken)
    : IRequest<ApplyPromotionResultDto>;

public sealed class GetAppliedCustomerPromotionQueryHandler
    : IRequestHandler<GetAppliedCustomerPromotionQuery, ApplyPromotionResultDto?>
{
    private readonly IApplicationDbContext _context;
    private readonly CustomerPaymentAccessService _accessService;

    public GetAppliedCustomerPromotionQueryHandler(
        IApplicationDbContext context,
        CustomerPaymentAccessService accessService)
    {
        _context = context;
        _accessService = accessService;
    }

    public async Task<ApplyPromotionResultDto?> Handle(
        GetAppliedCustomerPromotionQuery request,
        CancellationToken cancellationToken)
    {
        var order = await _accessService.GetAccessibleOrderAsync(
            request.OrderId,
            request.QrToken,
            hasPaymentAttemptAccess: false,
            cancellationToken);

        if (order == null)
            throw new KeyNotFoundException("Không tìm thấy đơn hàng hợp lệ.");

        var usage = await _context.PromotionUsages
            .AsNoTracking()
            .FirstOrDefaultAsync(
                item => item.OrderId == order.Id && item.Status == "Applied",
                cancellationToken);

        if (usage == null)
            return null;

        var promotion = await _context.Promotions
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == usage.PromotionId, cancellationToken);

        return promotion == null ? null : BuildResult(order.Id, promotion, usage);
    }

    internal static ApplyPromotionResultDto BuildResult(
        Guid orderId,
        Promotion promotion,
        PromotionUsage usage)
        => new()
        {
            PromotionId = promotion.Id,
            PromotionCode = promotion.PromotionCode,
            PromotionName = promotion.Name,
            DiscountType = promotion.DiscountType,
            DiscountValue = promotion.DiscountValue,
            OrderId = orderId,
            OrderAmount = usage.OrderAmount,
            DiscountAmount = usage.DiscountAmount,
            FinalAmount = Math.Max(0, usage.OrderAmount - usage.DiscountAmount),
            PromotionUsageId = usage.Id,
            Note = usage.Note
        };
}

public sealed class ApplyCustomerPromotionCommandHandler
    : IRequestHandler<ApplyCustomerPromotionCommand, ApplyPromotionResultDto>
{
    private readonly IApplicationDbContext _context;
    private readonly CustomerPaymentAccessService _accessService;

    public ApplyCustomerPromotionCommandHandler(
        IApplicationDbContext context,
        CustomerPaymentAccessService accessService)
    {
        _context = context;
        _accessService = accessService;
    }

    public async Task<ApplyPromotionResultDto> Handle(
        ApplyCustomerPromotionCommand request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.PromotionCode))
            throw new ArgumentException("Vui lòng nhập mã khuyến mãi.");

        var order = await _accessService.GetAccessibleOrderAsync(
            request.OrderId,
            request.QrToken,
            hasPaymentAttemptAccess: false,
            cancellationToken);

        if (order == null)
            throw new KeyNotFoundException("Không tìm thấy đơn hàng hợp lệ.");

        if (order.Status is "Completed" or "Cancelled")
            throw new InvalidOperationException("Đơn hàng đã hoàn tất hoặc đã hủy, không thể áp dụng khuyến mãi.");

        var paid = await _context.Payments
            .AsNoTracking()
            .AnyAsync(
                item => item.OrderId == order.Id && item.Status == "Paid",
                cancellationToken);
        if (paid)
            throw new InvalidOperationException("Đơn hàng đã thanh toán, không thể áp dụng thêm khuyến mãi.");

        var normalizedCode = request.PromotionCode.Trim().ToUpperInvariant();
        var existingUsage = await _context.PromotionUsages
            .FirstOrDefaultAsync(
                item => item.OrderId == order.Id && item.Status == "Applied",
                cancellationToken);

        if (existingUsage != null)
        {
            var existingPromotion = await _context.Promotions
                .FirstOrDefaultAsync(
                    item => item.Id == existingUsage.PromotionId,
                    cancellationToken)
                ?? throw new InvalidOperationException("Khuyến mãi đã áp dụng không còn tồn tại.");

            if (!string.Equals(
                    existingPromotion.PromotionCode,
                    normalizedCode,
                    StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    $"Đơn này đã áp dụng mã {existingPromotion.PromotionCode}. Mỗi đơn chỉ áp dụng một mã khuyến mãi.");
            }

            return GetAppliedCustomerPromotionQueryHandler.BuildResult(
                order.Id,
                existingPromotion,
                existingUsage);
        }

        var promotion = await _context.Promotions
            .FirstOrDefaultAsync(
                item => item.PromotionCode == normalizedCode,
                cancellationToken)
            ?? throw new InvalidOperationException("Không tìm thấy mã khuyến mãi.");

        var orderItems = await _context.OrderItems
            .Where(item => item.OrderId == order.Id && item.Status != "Cancelled")
            .ToListAsync(cancellationToken);
        if (orderItems.Count == 0)
            throw new InvalidOperationException("Đơn hàng chưa có món hợp lệ để áp dụng khuyến mãi.");

        var orderAmount = orderItems.Sum(item => item.TotalPrice);
        var discountAmount = promotion.CalculateDiscountAmount(orderAmount);

        // Khách có thể đã mở màn hình thanh toán trước rồi quay lại áp mã.
        // Sau khi mã đã được kiểm tra hợp lệ, vô hiệu QR cũ trước khi thay đổi
        // số tiền của đơn. Nếu QR cũ nhận tiền muộn, webhook hiện có sẽ đưa
        // giao dịch vào RequiresReview thay vì tự ghi nhận vào đơn.
        var openPaymentAttempts = await _context.PaymentAttempts
            .Where(item =>
                item.OrderId == order.Id &&
                (item.Status == PaymentAttempt.CreatingStatus ||
                 item.Status == PaymentAttempt.PendingStatus))
            .ToListAsync(cancellationToken);

        foreach (var attempt in openPaymentAttempts)
        {
            attempt.MarkCancelled(
                "PromotionAppliedAfterPaymentQrCreated: QR cũ đã bị thay thế vì khách áp mã khuyến mãi trước khi thanh toán.");
        }

        var usage = new PromotionUsage(
            promotion.Id,
            order.Id,
            null,
            promotion.PromotionCode,
            orderAmount,
            discountAmount,
            openPaymentAttempts.Count > 0
                ? "Khách hàng áp dụng trên CustomerWeb; QR thanh toán cũ đã được tự động hủy để tạo lại theo số tiền sau giảm."
                : "Khách hàng áp dụng trên CustomerWeb");

        promotion.IncreaseUsedCount();
        await _context.PromotionUsages.AddAsync(usage, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return GetAppliedCustomerPromotionQueryHandler.BuildResult(
            order.Id,
            promotion,
            usage);
    }
}
