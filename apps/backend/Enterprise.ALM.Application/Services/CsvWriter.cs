using System.Text;

namespace Enterprise.ALM.Application.Services;

/// <summary>
/// RFC 4180 CSV writing. Kept separate from AssetService so the escaping
/// rules can be unit-tested on their own, and reused by future exports.
/// </summary>
public static class CsvWriter
{
    // RFC 4180 specifies CRLF between records. Excel and Google Sheets both
    // accept a bare LF, but CRLF is the one that's actually in the spec.
    private const string RowSeparator = "\r\n";

    /// <summary>
    /// Quotes a field only when RFC 4180 requires it — when the field contains
    /// the delimiter, a double quote, CR, or LF. Internal quotes are escaped by
    /// doubling them ("" means one literal ").
    /// </summary>
    public static string Escape(string? value)
    {
        if (string.IsNullOrEmpty(value)) return string.Empty;

        var needsQuoting = value.Contains(',')
                        || value.Contains('"')
                        || value.Contains('\r')
                        || value.Contains('\n');

        if (!needsQuoting) return value;

        return "\"" + value.Replace("\"", "\"\"") + "\"";
    }

    /// <summary>
    /// Appends one record. Fields arrive as strings because the caller owns the
    /// formatting decision — that's what keeps culture-sensitive ToString()
    /// calls visible at the call site instead of hidden in here.
    /// </summary>
    public static void AppendRow(StringBuilder sb, params string?[] fields)
    {
        for (var i = 0; i < fields.Length; i++)
        {
            if (i > 0) sb.Append(',');
            sb.Append(Escape(fields[i]));
        }
        sb.Append(RowSeparator);
    }
}
