export async function gotoRoot(page) {
  const { baseURL } = await import('../fixtures/data/urls');
  await page.goto(baseURL);
}

export async function gotoLogin(page) {
  const { loginURL } = await import('../fixtures/data/urls');
  await page.goto(loginURL);
}
