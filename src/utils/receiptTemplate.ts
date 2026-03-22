export interface ReceiptData {
    restaurant: {
      company: string;
      address: string;
      logo: string;
    };
    tableNumber: number;
    diners: number;
    dishes: { name: string; quantity: number; price: number }[];
    subtotal: number;
    tax: number;
    total: number;
    orderId?: string;
    printTime: string;
  }
  
export const generateReceiptHTML = (data: ReceiptData): string => {
const { restaurant, tableNumber, diners, dishes, subtotal, tax, total, orderId, printTime } = data;

return `
    <html>
    <head>
        <style>
        .container {
            width: 512px;
            display: flex;
            flex-wrap: wrap;
            margin: 0 auto;
        }
        .restaurantInfo {
            width: 100%;
            margin-top: 20px;
            text-align: center;
        }
        .logo {
            width: 100px;
            height: 100px;
            object-fit: contain;
        }
        .company {
            font-size: 20px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 10px;
        }
        .address {
            margin-top: 5px;
            font-size: 16px;
            text-align: center;
        }
        .orderInfo {
            width: 100%;
            border-top: 1px solid #ccc;
            margin-top: 10px;
        }
        .curTable {
            text-align: center;
            font-size: 22px;
        }
        .diners {
            text-align: right;
            font-size: 20px;
            margin-right: 10px;
        }
        .dishesInfo {
            width: 100%;
            border-top: 1px solid #ccc;
            display: flex;
        }
        table {
            flex: 1;
            margin-top: 5px;
            width: 100%;
            border-collapse: collapse;
        }
        table th {
            font-weight: bold;
            font-size: 24px;
        }
        table td {
            font-size: 22px;
            padding: 2px;
        }
        table th:nth-child(1) {
            width: 42%;
            text-align: left;
            padding-left: 5px;
        }
        table th:nth-child(2) {
            width: 8%;
            text-align: right;
        }
        table th:nth-child(3) {
            width: 50%;
            text-align: right;
            padding-right: 5px;
        }
        table td:nth-child(1) {
            width: 42%;
            text-align: left;
            padding-left: 5px;
        }
        table td:nth-child(2) {
            width: 8%;
            text-align: right;
        }
        table td:nth-child(3) {
            width: 50%;
            text-align: right;
            padding-right: 5px;
        }
        .totalInfo {
            width: 100%;
            border-top: 1px solid #ccc;
            justify-content: flex-end;
        }
        .subTotal {
            text-align: right;
            font-size: 20px;
            margin-right: 10px;
        }
        .tax {
            text-align: right;
            font-size: 20px;
            margin-right: 10px;
        }
        .totalAmount {
            text-align: right;
            font-size: 22px;
            font-weight: bold;
            margin-right: 10px;
        }
        .footer {
            width: 100%;
            text-align: center;
            margin-top: 20px;
            font-size: 14px;
            color: #666;
        }
        </style>
    </head>
    <body>
        <div class="container">
        <div class="restaurantInfo">
            <img class="logo" src="${restaurant.logo}" alt="Restaurant Logo">
            <p class="company">${restaurant.company}</p>
            <p class="address">${restaurant.address}</p>
        </div>
        <div class="orderInfo">
            <p class="curTable">Table ${tableNumber}</p>
            <p class="diners">Diners: ${diners}</p>
        </div>
        <div class="dishesInfo">
            <table>
            <thead>
                <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                </tr>
            </thead>
            <tbody>
                ${dishes
                .map(
                    (dish) => `
                <tr>
                    <td>${dish.name}</td>
                    <td>${dish.quantity}</td>
                    <td>$${(dish.price / 100).toFixed(2)}</td>
                </tr>`
                )
                .join('')}
            </tbody>
            </table>
        </div>
        <div class="totalInfo">
            <p class="subTotal">Subtotal: $${(subtotal / 100).toFixed(2)}</p>
            <p class="tax">Tax (10%): $${(tax / 100).toFixed(2)}</p>
            <p class="totalAmount">Total: $${(total / 100).toFixed(2)}</p>
        </div>
        <div class="footer">
            ${orderId ? `<p>Order #${orderId}</p>` : ''}
            <p>${printTime}</p>
            <p>Thank you for dining with us!</p>
        </div>
        </div>
    </body>
    </html>
`;
};