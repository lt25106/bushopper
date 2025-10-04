export async function handler(event) {
  const currentlink = (event.headers.host || "").toLowerCase()
  if (/Mobi|Android|iPhone|iPad/i.test(event.headers["user-agent"] || "") && currentlink != "mobilebushopper.netlify.app") {
    return {
      statusCode: 301,
      headers: { Location: "https://mobilebushopper.netlify.app" },
    }
  } else if (currentlink != "mapbushopper.netlify.app") {
    return {
      statusCode: 301,
      headers: { Location: "https://mapbushopper.netlify.app" },
    }
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html" },
    body: "",
  };
}