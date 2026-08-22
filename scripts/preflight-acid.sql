SET NOCOUNT ON;

-- Mỗi truy vấn bên dưới phải trả về 0 dòng trước khi chạy migration
-- 20260823120000_AddRequestProtectionAndAcidGuards.

SELECT 'RestaurantTables invalid capacity' AS Problem, Id
FROM RestaurantTables
WHERE Capacity <= 0;

SELECT 'Reservations invalid values' AS Problem, Id
FROM Reservations
WHERE NumberOfGuests <= 0 OR DepositAmount < 0;

SELECT 'Orders invalid values' AS Problem, Id
FROM Orders
WHERE TotalAmount < 0 OR OrderType NOT IN ('DineIn', 'Takeaway');

SELECT 'OrderItems invalid values' AS Problem, Id
FROM OrderItems
WHERE Quantity < 1
   OR Quantity > 99
   OR UnitPrice < 0
   OR TotalPrice < 0
   OR TotalPrice <> UnitPrice * Quantity;

SELECT 'Payments invalid values' AS Problem, Id
FROM Payments
WHERE TotalAmount < 0
   OR DiscountAmount < 0
   OR VatAmount < 0
   OR FinalAmount <= 0
   OR CustomerPaid < 0
   OR ChangeAmount < 0
   OR DiscountAmount > TotalAmount
   OR CustomerPaid < FinalAmount
   OR ChangeAmount <> CustomerPaid - FinalAmount
   OR FinalAmount - TotalAmount + DiscountAmount - VatAmount < 0;

SELECT 'PaymentAttempts invalid values' AS Problem, Id
FROM PaymentAttempts
WHERE Amount <= 0 OR (ReceivedAmount IS NOT NULL AND ReceivedAmount <= 0);

SELECT 'Invoices invalid values' AS Problem, Id
FROM Invoices
WHERE TotalAmount < 0
   OR DiscountAmount < 0
   OR VatAmount < 0
   OR FinalAmount <= 0
   OR CustomerPaid < 0
   OR ChangeAmount < 0
   OR DiscountAmount > TotalAmount
   OR CustomerPaid < FinalAmount
   OR ChangeAmount <> CustomerPaid - FinalAmount
   OR FinalAmount - TotalAmount + DiscountAmount - VatAmount < 0;

SELECT 'InvoiceItems invalid values' AS Problem, Id
FROM InvoiceItems
WHERE Quantity <= 0
   OR UnitPrice < 0
   OR TotalPrice < 0
   OR TotalPrice <> UnitPrice * Quantity;

SELECT
    'Duplicate open payment attempts' AS Problem,
    OrderId,
    Provider,
    COUNT(*) AS DuplicateCount
FROM PaymentAttempts
WHERE Status IN ('Creating', 'Pending')
GROUP BY OrderId, Provider
HAVING COUNT(*) > 1;

SELECT
    'Duplicate provider reference' AS Problem,
    Provider,
    ProviderReference,
    COUNT(*) AS DuplicateCount
FROM PaymentAttempts
WHERE ProviderReference IS NOT NULL
GROUP BY Provider, ProviderReference
HAVING COUNT(*) > 1;

SELECT 'RestaurantTables orphan AreaId' AS Problem, child.Id
FROM RestaurantTables child
LEFT JOIN Areas parent ON parent.Id = child.AreaId
WHERE parent.Id IS NULL;

SELECT 'Reservations orphan RestaurantTableId' AS Problem, child.Id
FROM Reservations child
LEFT JOIN RestaurantTables parent ON parent.Id = child.RestaurantTableId
WHERE parent.Id IS NULL;

SELECT 'Payments orphan OrderId' AS Problem, child.Id
FROM Payments child
LEFT JOIN Orders parent ON parent.Id = child.OrderId
WHERE parent.Id IS NULL;

SELECT 'OrderItems orphan OrderId' AS Problem, child.Id
FROM OrderItems child
LEFT JOIN Orders parent ON parent.Id = child.OrderId
WHERE parent.Id IS NULL;

SELECT 'OrderItems orphan MenuItemId' AS Problem, child.Id
FROM OrderItems child
LEFT JOIN MenuItems parent ON parent.Id = child.MenuItemId
WHERE parent.Id IS NULL;

SELECT 'Invoices orphan OrderId' AS Problem, child.Id
FROM Invoices child
LEFT JOIN Orders parent ON parent.Id = child.OrderId
WHERE parent.Id IS NULL;

SELECT 'Invoices orphan PaymentId' AS Problem, child.Id
FROM Invoices child
LEFT JOIN Payments parent ON parent.Id = child.PaymentId
WHERE parent.Id IS NULL;

SELECT 'Invoices orphan RestaurantTableId' AS Problem, child.Id
FROM Invoices child
LEFT JOIN RestaurantTables parent ON parent.Id = child.RestaurantTableId
WHERE child.RestaurantTableId IS NOT NULL AND parent.Id IS NULL;

SELECT 'InvoiceItems orphan InvoiceId' AS Problem, child.Id
FROM InvoiceItems child
LEFT JOIN Invoices parent ON parent.Id = child.InvoiceId
WHERE parent.Id IS NULL;

SELECT 'InvoiceItems orphan MenuItemId' AS Problem, child.Id
FROM InvoiceItems child
LEFT JOIN MenuItems parent ON parent.Id = child.MenuItemId
WHERE parent.Id IS NULL;

SELECT 'InvoiceItems orphan OrderItemId' AS Problem, child.Id
FROM InvoiceItems child
LEFT JOIN OrderItems parent ON parent.Id = child.OrderItemId
WHERE parent.Id IS NULL;
