interface OrderStatusEmailProps {
  brandName: string
  supportEmail: string
  customerName: string
  orderNumber: string
  oldStatus: string
  newStatus: string
  statusDate: string
  trackingNumber?: string
  carrier?: string
  trackingUrl?: string
  items: { name: string; size: string; qty: number; price: number; image: string }[]
  estimatedDelivery?: string
  orderUrl: string
}

function getProgressWidth(newStatus: string) {
  if (newStatus === 'delivered') return '100%'
  if (newStatus === 'shipped') return '66%'
  return '33%'
}

export default function OrderStatusEmail({
  brandName,
  supportEmail,
  customerName,
  orderNumber,
  oldStatus,
  newStatus,
  statusDate,
  trackingNumber,
  carrier,
  trackingUrl,
  items,
  estimatedDelivery,
  orderUrl,
}: OrderStatusEmailProps) {
  const normalizedStatus = newStatus.toLowerCase()
  const statusSteps = [
    { label: 'Confirmed', active: true },
    { label: 'Processing', active: true },
    {
      label: 'Shipped',
      active: normalizedStatus === 'shipped' || normalizedStatus === 'delivered',
    },
    { label: 'Delivered', active: normalizedStatus === 'delivered' },
  ]

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
          padding: '32px 24px',
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
            fontSize: '22px',
            color: '#1a1a1a',
            fontWeight: 400,
            margin: '0 0 8px 0',
            letterSpacing: '1px',
          }}
        >
          Your Order Status Has Changed
        </h1>
        <p style={{ fontSize: '12px', color: '#7a5c36', margin: 0 }}>
          {statusDate}
        </p>
      </div>

      <div style={{ padding: '28px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <p style={{ fontSize: '13px', color: '#666', margin: '0 0 12px 0' }}>
            Hi {customerName.split(' ')[0] || customerName}, order{' '}
            <strong style={{ color: '#1a1a1a' }}>#{orderNumber}</strong> has been
            updated
          </p>
          <div
            style={{
              display: 'inline-block',
              backgroundColor: '#fdf4e8',
              border: '1px solid #d4b896',
              borderRadius: '4px',
              padding: '12px 28px',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                color: '#999',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              {oldStatus}
            </span>
            <span style={{ fontSize: '18px', color: '#b89a6a', margin: '0 8px' }}>
              &#8594;
            </span>
            <span
              style={{
                fontSize: '14px',
                color: '#1a1a1a',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '2px',
              }}
            >
              {newStatus}
            </span>
          </div>
        </div>

        <div style={{ marginBottom: '28px' }}>
          <table
            role="presentation"
            width="100%"
            cellPadding="0"
            cellSpacing="0"
            style={{ borderCollapse: 'collapse', marginBottom: '8px' }}
          >
            <tbody>
              <tr>
                {statusSteps.map((step, index) => (
                  <td
                    key={step.label}
                    style={{
                      width: `${100 / statusSteps.length}%`,
                      fontSize: '9px',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      color: step.active ? '#b89a6a' : '#ccc',
                      fontWeight: step.active ? 600 : 400,
                      textAlign:
                        index === 0
                          ? 'left'
                          : index === statusSteps.length - 1
                            ? 'right'
                            : 'center',
                    }}
                  >
                    {step.label}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
          <div
            style={{
              height: '3px',
              backgroundColor: '#f0e8da',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: getProgressWidth(normalizedStatus),
                backgroundColor: '#b89a6a',
                borderRadius: '2px',
              }}
            />
          </div>
        </div>

        {trackingNumber ? (
          <div
            style={{
              backgroundColor: '#fdfbf7',
              border: '1px solid #e8d5b7',
              padding: '16px 20px',
              marginBottom: '24px',
            }}
          >
            <p
              style={{
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '3px',
                color: '#b89a6a',
                margin: '0 0 8px 0',
                fontWeight: 600,
              }}
            >
              Tracking Information
            </p>
            {carrier ? (
              <div style={{ marginBottom: '4px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    color: '#999',
                    display: 'inline-block',
                    width: '90px',
                  }}
                >
                  Carrier:
                </span>
                <span style={{ fontSize: '12px', color: '#1a1a1a', fontWeight: 600 }}>
                  {carrier}
                </span>
              </div>
            ) : null}
            <div style={{ marginBottom: estimatedDelivery ? '4px' : 0 }}>
              <span
                style={{
                  fontSize: '11px',
                  color: '#999',
                  display: 'inline-block',
                  width: '90px',
                }}
              >
                Tracking:
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color: '#1a1a1a',
                  fontFamily: 'monospace',
                }}
              >
                {trackingNumber}
              </span>
            </div>
            {estimatedDelivery ? (
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    color: '#999',
                    display: 'inline-block',
                    width: '90px',
                  }}
                >
                  Est. Delivery:
                </span>
                <span style={{ fontSize: '12px', color: '#1a1a1a' }}>
                  {estimatedDelivery}
                </span>
              </div>
            ) : null}
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
            Order Summary
          </p>
          {items.map((item, i) => (
            <div
              key={`${item.name}-${i}`}
              style={{
                padding: '12px 0',
                borderBottom:
                  i < items.length - 1 ? '1px solid #f0e8da' : 'none',
              }}
            >
              <table
                role="presentation"
                width="100%"
                cellPadding="0"
                cellSpacing="0"
                style={{ borderCollapse: 'collapse' }}
              >
                <tbody>
                  <tr>
                    <td style={{ width: '48px', verticalAlign: 'middle' }}>
                      <img
                        src={item.image}
                        alt={item.name}
                        width="48"
                        height="48"
                        style={{ borderRadius: '4px', objectFit: 'cover', display: 'block' }}
                      />
                    </td>
                    <td style={{ width: '14px', fontSize: 0, lineHeight: 0 }}>&nbsp;</td>
                    <td style={{ verticalAlign: 'middle' }}>
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
                    </td>
                    <td
                      style={{
                        verticalAlign: 'middle',
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                        fontSize: '13px',
                        color: '#1a1a1a',
                        fontWeight: 600,
                      }}
                    >
                      ${item.price.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
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
              Track Package
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
            View Order Details
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
        <p style={{ fontSize: '9px', color: '#ccc', margin: 0 }}>
          © {new Date().getFullYear()} {brandName}. All rights reserved.
        </p>
      </div>
    </div>
  )
}
