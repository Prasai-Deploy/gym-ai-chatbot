async function testFlow() {
  console.log("1. Hitting /api/auth/demo...");
  const res = await fetch("http://localhost:3000/api/auth/demo", { method: "POST" });
  console.log("Status:", res.status);
  
  const setCookie = res.headers.get("set-cookie");
  console.log("Set-Cookie Header:", setCookie);
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error("Demo login failed:", errorData);
    return;
  }
  
  const user = await res.json();
  console.log("Response User:", user);
  
  console.log("\n2. Hitting /api/auth/me...");
  const authRes = await fetch("http://localhost:3000/api/auth/me", {
    headers: setCookie ? { "cookie": setCookie } : {}
  });
  console.log("Auth Status:", authRes.status);
  
  const authUser = await authRes.json();
  console.log("Auth User:", authUser);
}

testFlow();
