import Script from "next/script";

function MyApp({ Component, pageProps }) {
  return (
    <>
      {/* Google Analytics */}
      <Script 
        src="https://www.googletagmanager.com/gtag/js?id=G-T0Q4KWFQJ6"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-T0Q4KWFQJ6');
        `}
      </Script>

      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
