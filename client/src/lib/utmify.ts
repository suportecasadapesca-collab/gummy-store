export interface UtmParams {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  src: string | null;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp("(?:^|;)\\s*" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getUtmParams(): UtmParams {
  return {
    utm_source:   getCookie("utm_source")   ?? new URLSearchParams(window.location.search).get("utm_source"),
    utm_medium:   getCookie("utm_medium")   ?? new URLSearchParams(window.location.search).get("utm_medium"),
    utm_campaign: getCookie("utm_campaign") ?? new URLSearchParams(window.location.search).get("utm_campaign"),
    utm_term:     getCookie("utm_term")     ?? new URLSearchParams(window.location.search).get("utm_term"),
    utm_content:  getCookie("utm_content")  ?? new URLSearchParams(window.location.search).get("utm_content"),
    src:          getCookie("src")          ?? new URLSearchParams(window.location.search).get("src"),
  };
}
