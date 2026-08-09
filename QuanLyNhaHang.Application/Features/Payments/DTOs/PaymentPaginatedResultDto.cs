namespace QuanLyNhaHang.Application.Features.Payments.DTOs;

public sealed class PaymentPaginatedResultDto
{
    public IReadOnlyCollection<PaymentDto> Items { get; init; } =
        Array.Empty<PaymentDto>();

    public int PageNumber { get; init; }

    public int TotalPages { get; init; }

    public int TotalCount { get; init; }

    public bool HasPreviousPage => PageNumber > 1;

    public bool HasNextPage => PageNumber < TotalPages;

    public int PaidCount { get; init; }

    public int CancelledCount { get; init; }

    public decimal Revenue { get; init; }
}
