/** Navigate to the independent Job Sarthi credential sign-in page. */
export const goToLogin = () => {
  const next = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/login${next && next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`);
};
