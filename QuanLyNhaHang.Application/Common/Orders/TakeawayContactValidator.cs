using System.Text;

namespace QuanLyNhaHang.Application.Common.Orders;

public static class TakeawayContactValidator
{
    public const int MinCustomerNameLength = 4;
    public const int MaxCustomerNameLength = 60;
    public const int MaxNoteLength = 500;

    public static string NormalizeCustomerName(string? value)
    {
        var normalized = NormalizeWhitespace(value).Normalize(NormalizationForm.FormC);

        if (normalized.Length < MinCustomerNameLength ||
            normalized.Length > MaxCustomerNameLength)
        {
            throw new ArgumentException(
                $"Họ và tên người nhận phải từ {MinCustomerNameLength} đến " +
                $"{MaxCustomerNameLength} ký tự.");
        }

        var words = normalized.Split(
            ' ',
            StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        if (words.Length < 2)
        {
            throw new ArgumentException(
                "Vui lòng nhập đầy đủ họ và tên người nhận, tối thiểu 2 từ.");
        }

        if (normalized.Count(char.IsLetter) < MinCustomerNameLength ||
            words.Any(word =>
                !char.IsLetter(word[0]) ||
                !char.IsLetter(word[^1]) ||
                !word.All(IsAllowedNameCharacter)))
        {
            throw new ArgumentException(
                "Họ và tên chỉ được chứa chữ cái, khoảng trắng, dấu nháy hoặc gạch nối.");
        }

        return normalized;
    }

    public static string NormalizeVietnameseMobileNumber(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("Vui lòng nhập số điện thoại người nhận món.");

        var compact = new string(value
            .Trim()
            .Where(character =>
                !char.IsWhiteSpace(character) &&
                character is not '-' and not '.')
            .ToArray());

        if (compact.StartsWith("+84", StringComparison.Ordinal))
            compact = $"0{compact[3..]}";
        else if (compact.StartsWith("84", StringComparison.Ordinal) && compact.Length == 11)
            compact = $"0{compact[2..]}";

        var validPrefix = compact.Length >= 2 &&
                          compact[0] == '0' &&
                          compact[1] is '3' or '5' or '7' or '8' or '9';

        if (compact.Length != 10 ||
            !validPrefix ||
            compact.Any(character => !char.IsAsciiDigit(character)))
        {
            throw new ArgumentException(
                "Số điện thoại di động Việt Nam phải gồm 10 số và bắt đầu bằng " +
                "03, 05, 07, 08 hoặc 09.");
        }

        return compact;
    }

    public static string? NormalizeNote(string? value)
    {
        var normalized = value?.Trim();
        if (string.IsNullOrEmpty(normalized))
            return null;

        if (normalized.Length > MaxNoteLength)
        {
            throw new ArgumentException(
                $"Ghi chú không được vượt quá {MaxNoteLength} ký tự.");
        }

        return normalized;
    }

    private static string NormalizeWhitespace(string? value)
        => string.Join(
            ' ',
            (value ?? string.Empty).Split(
                (char[]?)null,
                StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));

    private static bool IsAllowedNameCharacter(char character)
        => char.IsLetter(character) || character is '\'' or '’' or '-';
}
