interface OrderConfirmationEmailProps {
  brandName: string
  supportEmail: string
  customerName: string
  orderNumber: string
  orderDate: string
  items: { name: string; size: string; qty: number; price: number; image: string }[]
  shippingAddress: {
    name: string
    street: string
    city: string
    state?: string
    zip: string
    country?: string
  }
  subtotal: number
  shipping: number
  tax: number
  discount: number
  total: number
  estimatedDelivery?: string
  paymentMethod: string
  orderUrl: string
  trackingUrl?: string
  privacyUrl: string
  termsUrl: string
  returnsUrl: string
}

export default function OrderConfirmationEmail({
  brandName,
  supportEmail,
  customerName,
  orderNumber,
  orderDate,
  items,
  shippingAddress,
  subtotal,
  shipping,
  tax,
  discount,
  total,
  estimatedDelivery,
  paymentMethod,
  orderUrl,
  trackingUrl,
  privacyUrl,
  termsUrl,
  returnsUrl,
}: OrderConfirmationEmailProps) {
  return (
    <div
      style={{
        maxWidth: '600px',
        margin: '0 auto',
        fontFamily: "Georgia, 'Times New Roman', serif",
        backgroundColor: '#ffffff',
      }}
    >
      <div
        style={{
          backgroundColor: '#fdf4e8',
          padding: '36px 24px',
          textAlign: 'center',
          borderBottom: '2px solid #e8d5b7',
        }}
      >
        <div style={{ marginBottom: '12px' }}>
          <span
            style={{
              display: 'inline-block',
              width: '36px',
              height: '36px',
              lineHeight: '36px',
              border: '1px solid #b89a6a',
              color: '#b89a6a',
              fontSize: '22px',
              textAlign: 'center',
            }}
          >
            &#9750;
          </span>
        </div>
        <div
          style={{
            fontSize: '11px',
            letterSpacing: '4px',
            textTransform: 'uppercase',
            color: '#b89a6a',
            fontWeight: 600,
            marginBottom: '8px',
          }}
        >
          {brandName}
        </div>
        <h1
          style={{
            fontSize: '24px',
            color: '#1a1a1a',
            fontWeight: 400,
            margin: '0 0 6px 0',
            letterSpacing: '1px',
          }}
        >
          Thank You, {customerName.split(' ')[0] || customerName}!
        </h1>
        <p style={{ fontSize: '12px', color: '#7a5c36', margin: '0 0 4px 0' }}>
          Your order has been confirmed.
        </p>
        <p style={{ fontSize: '11px', color: '#999', margin: 0 }}>
          Order <strong style={{ color: '#1a1a1a' }}>#{orderNumber}</strong> ·{' '}
          {orderDate}
        </p>
      </div>

      <div style={{ padding: '28px 24px' }}>
        {estimatedDelivery ? (
          <div
            style={{
              backgroundColor: '#fdfbf7',
              border: '1px solid #e8d5b7',
              padding: '16px 20px',
              marginBottom: '24px',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '3px',
                color: '#b89a6a',
                margin: '0 0 4px 0',
                fontWeight: 600,
              }}
            >
              Estimated Delivery
            </p>
            <p
              style={{
                fontSize: '16px',
                color: '#1a1a1a',
                margin: 0,
                fontWeight: 500,
              }}
            >
              {estimatedDelivery}
            </p>
          </div>
        ) : null}

        <div style={{ marginBottom: '24px' }}>
          <p
            style={{
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '3px',
              color: '#1a1a1a',
              margin: '0 0 12px 0',
              fontWeight: 700,
            }}
          >
            Items in Your Order
          </p>
          {items.map((item, i) => (
            <div
              key={`${item.name}-${i}`}
              style={{
                padding: '12px 0',
                borderBottom:
                  i < items.length - 1 ? '1px solid #f0e8da' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <img
                src={item.image}
                alt={item.name}
                width="52"
                height="52"
                style={{ borderRadius: '4px', objectFit: 'cover' }}
              />
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontSize: '13px',
                    color: '#1a1a1a',
                    margin: '0 0 2px 0',
                    fontWeight: 500,
                  }}
                >
                  {item.name}
                </p>
                <p style={{ fontSize: '11px', color: '#999', margin: 0 }}>
                  {item.size} · Qty: {item.qty}
                </p>
              </div>
              <span
                style={{ fontSize: '13px', color: '#1a1a1a', fontWeight: 600 }}
              >
                ${item.price.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            backgroundColor: '#fdfbf7',
            border: '1px solid #e8d5b7',
            padding: '16px 20px',
            marginBottom: '20px',
          }}
        >
          <div style={{ marginBottom: '4px', overflow: 'hidden' }}>
            <span style={{ fontSize: '11px', color: '#999', float: 'left' }}>
              Subtotal
            </span>
            <span style={{ fontSize: '11px', color: '#1a1a1a', float: 'right' }}>
              ${subtotal.toFixed(2)}
            </span>
          </div>
          <div style={{ clear: 'both' }} />
          <div style={{ marginBottom: '4px', overflow: 'hidden' }}>
            <span style={{ fontSize: '11px', color: '#999', float: 'left' }}>
              Shipping
            </span>
            <span
              style={{
                fontSize: '11px',
                color: shipping === 0 ? '#2d8a56' : '#1a1a1a',
                float: 'right',
              }}
            >
              {shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}
            </span>
          </div>
          <div style={{ clear: 'both' }} />
          <div style={{ marginBottom: '4px', overflow: 'hidden' }}>
            <span style={{ fontSize: '11px', color: '#999', float: 'left' }}>
              Tax
            </span>
            <span style={{ fontSize: '11px', color: '#1a1a1a', float: 'right' }}>
              ${tax.toFixed(2)}
            </span>
          </div>
          <div style={{ clear: 'both' }} />
          {discount > 0 ? (
            <>
              <div style={{ marginBottom: '8px', overflow: 'hidden' }}>
                <span style={{ fontSize: '11px', color: '#999', float: 'left' }}>
                  Discount
                </span>
                <span
                  style={{ fontSize: '11px', color: '#b89a6a', float: 'right' }}
                >
                  -${discount.toFixed(2)}
                </span>
              </div>
              <div style={{ clear: 'both' }} />
            </>
          ) : null}
          <div
            style={{
              borderTop: '1px solid #e8d5b7',
              paddingTop: '8px',
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                fontSize: '13px',
                color: '#1a1a1a',
                fontWeight: 700,
                float: 'left',
              }}
            >
              Total
            </span>
            <span
              style={{
                fontSize: '13px',
                color: '#1a1a1a',
                fontWeight: 700,
                float: 'right',
              }}
            >
              ${total.toFixed(2)}
            </span>
          </div>
          <div style={{ clear: 'both' }} />
        </div>

        <div style={{ overflow: 'hidden', marginBottom: '24px' }}>
          <div style={{ width: '48%', float: 'left' }}>
            <p
              style={{
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '3px',
                color: '#1a1a1a',
                margin: '0 0 6px 0',
                fontWeight: 700,
              }}
            >
              Shipping To
            </p>
            <p
              style={{
                fontSize: '11px',
                color: '#666',
                margin: '0 0 2px 0',
                lineHeight: 1.5,
              }}
            >
              {shippingAddress.name}
              <br />
              {shippingAddress.street}
              <br />
              {shippingAddress.city}
              {shippingAddress.state ? `, ${shippingAddress.state}` : ''}{' '}
              {shippingAddress.zip}
              {shippingAddress.country ? (
                <>
                  <br />
                  {shippingAddress.country}
                </>
              ) : null}
            </p>
          </div>
          <div style={{ width: '48%', float: 'right', textAlign: 'right' }}>
            <p
              style={{
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '3px',
                color: '#1a1a1a',
                margin: '0 0 6px 0',
                fontWeight: 700,
              }}
            >
              Payment
            </p>
            <p style={{ fontSize: '11px', color: '#666', margin: 0 }}>
              {paymentMethod}
            </p>
          </div>
        </div>
        <div style={{ clear: 'both' }} />

        <div style={{ textAlign: 'center' }}>
          {trackingUrl ? (
            <a
              href={trackingUrl}
              style={{
                display: 'inline-block',
                backgroundColor: '#b89a6a',
                color: '#ffffff',
                padding: '12px 32px',
                textDecoration: 'none',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '3px',
                fontWeight: 600,
                marginRight: '10px',
              }}
            >
              Track Your Order
            </a>
          ) : null}
          <a
            href={orderUrl}
            style={{
              display: 'inline-block',
              border: '1px solid #d4b896',
              color: '#7a5c36',
              padding: '12px 28px',
              textDecoration: 'none',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '3px',
              fontWeight: 600,
            }}
          >
            View Order
          </a>
        </div>
      </div>

      <div
        style={{
          borderTop: '1px solid #e8d5b7',
          padding: '20px 24px',
          textAlign: 'center',
          backgroundColor: '#fdfbf7',
        }}
      >
        <p style={{ fontSize: '10px', color: '#999', lineHeight: 1.6, margin: '0 0 12px 0' }}>
          {brandName}
          <br />
          Questions? Reply to this email or contact{' '}
          <a
            href={`mailto:${supportEmail}`}
            style={{ color: '#b89a6a', textDecoration: 'none' }}
          >
            {supportEmail}
          </a>
        </p>
        <div style={{ marginBottom: '10px' }}>
          {[
            { href: privacyUrl, label: 'Privacy' },
            { href: termsUrl, label: 'Terms' },
            { href: returnsUrl, label: 'Returns' },
          ].map((link, i) => (
            <span key={link.label}>
              <a
                href={link.href}
                style={{
                  fontSize: '9px',
                  color: '#ccc',
                  textDecoration: 'underline',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                {link.label}
              </a>
              {i < 2 ? (
                <span style={{ color: '#e8d5b7', margin: '0 8px' }}>·</span>
              ) : null}
            </span>
          ))}
        </div>
        <p style={{ fontSize: '9px', color: '#ccc', margin: 0 }}>
          © {new Date().getFullYear()} {brandName}. All rights reserved.
        </p>
      </div>
    </div>
  )
}
