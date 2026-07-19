interface NewsletterEmailProps {
  brandName: string
  edition: string
  date: string
  heroTitle: string
  heroSubtitle: string
  heroImage: string
  contentHtml: string
  unsubscribeUrl: string
}

export default function NewsletterEmail({
  brandName,
  edition,
  date,
  heroTitle,
  heroSubtitle,
  heroImage,
  contentHtml,
  unsubscribeUrl,
}: NewsletterEmailProps) {
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
          padding: '28px 24px',
          textAlign: 'center',
          borderBottom: '1px solid #e8d5b7',
        }}
      >
        <div style={{ marginBottom: '10px' }}>
          <span
            style={{
              display: 'inline-block',
              width: '32px',
              height: '32px',
              lineHeight: '32px',
              border: '1px solid #b89a6a',
              color: '#b89a6a',
              fontSize: '20px',
              textAlign: 'center',
            }}
          >
            &#9750;
          </span>
        </div>
        <div
          style={{
            fontSize: '10px',
            letterSpacing: '5px',
            textTransform: 'uppercase',
            color: '#b89a6a',
            fontWeight: 600,
            marginBottom: '3px',
          }}
        >
          {brandName}
        </div>
        <div
          style={{
            fontSize: '16px',
            color: '#1a1a1a',
            fontWeight: 400,
            letterSpacing: '1px',
          }}
        >
          {edition}
        </div>
        <div
          style={{
            fontSize: '10px',
            color: '#999',
            marginTop: '3px',
            textTransform: 'uppercase',
            letterSpacing: '2px',
          }}
        >
          {date}
        </div>
      </div>

      <table
        role="presentation"
        width="100%"
        cellPadding="0"
        cellSpacing="0"
        style={{ borderCollapse: 'collapse' }}
      >
        <tbody>
          <tr>
            <td>
              <img
                src={heroImage}
                alt=""
                width="600"
                height="280"
                style={{ display: 'block', width: '100%', height: 'auto' }}
              />
            </td>
          </tr>
          <tr>
            <td
              style={{
                padding: '28px 24px',
                backgroundColor: '#2b2118',
              }}
            >
              <h2
                style={{
                  color: '#ffffff',
                  fontSize: '22px',
                  fontWeight: 400,
                  margin: '0 0 6px 0',
                  letterSpacing: '1px',
                }}
              >
                {heroTitle}
              </h2>
              <p
                style={{
                  color: '#efe3d3',
                  fontSize: '11px',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {heroSubtitle}
              </p>
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ padding: '28px 24px' }}>
        <div
          style={{
            fontSize: '14px',
            lineHeight: 1.8,
            color: '#444',
          }}
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </div>

      <div
        style={{
          padding: '20px 24px',
          textAlign: 'center',
          backgroundColor: '#fdfbf7',
          borderTop: '1px solid #e8d5b7',
        }}
      >
        <p
          style={{
            fontSize: '9px',
            textTransform: 'uppercase',
            letterSpacing: '3px',
            color: '#b89a6a',
            margin: '0 0 12px 0',
            fontWeight: 600,
          }}
        >
          Follow the Scent
        </p>
        <p style={{ fontSize: '10px', color: '#999', lineHeight: 1.6, margin: '0 0 12px 0' }}>
          {brandName}
          <br />
          <a
            href={unsubscribeUrl}
            style={{ color: '#ccc', textDecoration: 'underline', fontSize: '9px' }}
          >
            Unsubscribe
          </a>
        </p>
        <p style={{ fontSize: '9px', color: '#ccc', margin: 0 }}>
          © {new Date().getFullYear()} {brandName}. All rights reserved.
        </p>
      </div>
    </div>
  )
}
