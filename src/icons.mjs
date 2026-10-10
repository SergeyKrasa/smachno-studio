// Набор иконок: один штрих 1.8, скруглённые концы. Вставляется в страницу как спрайт.
const s = (id, body, vb = "0 0 24 24") =>
  `<symbol id="i-${id}" viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</symbol>`;

export const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
${s("clock", '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>')}
${s("bowl", '<path d="M3.5 11h17a8.5 8.5 0 0 1-17 0Z"/><path d="M8 20h8"/><path d="M9 7c0-1.2 1-1.6 1-2.8M13 7c0-1.2 1-1.6 1-2.8"/>')}
${s("tag", '<path d="M3.5 12.6V4.5a1 1 0 0 1 1-1h8.1l8 8a1.4 1.4 0 0 1 0 2l-6.1 6.1a1.4 1.4 0 0 1-2 0Z"/><circle cx="8.2" cy="8.2" r="1.4"/>')}
${s("play", '<path d="M7 4.8v14.4a.8.8 0 0 0 1.2.7l11.3-7.2a.8.8 0 0 0 0-1.4L8.2 4.1A.8.8 0 0 0 7 4.8Z" fill="currentColor" stroke="none"/>')}
${s("pause", '<path d="M8.5 5v14M15.5 5v14" stroke-width="2.6"/>')}
${s("arrow", '<path d="M4.5 12h15M13.5 6l6 6-6 6"/>')}
${s("back", '<path d="M19.5 12h-15M10.5 6l-6 6 6 6"/>')}
${s("chevron", '<path d="m9 5 7 7-7 7"/>')}
${s("close", '<path d="M6 6l12 12M18 6 6 18"/>')}
${s("check", '<path d="m5 12.5 4.5 4.5L19 7.5"/>')}
${s("minus", '<path d="M6 12h12"/>')}
${s("plus", '<path d="M12 6v12M6 12h12"/>')}
${s("list", '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.6" cy="6.5" r="1" fill="currentColor"/><circle cx="4.6" cy="12" r="1" fill="currentColor"/><circle cx="4.6" cy="17.5" r="1" fill="currentColor"/>')}
${s("search", '<circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.6 15.6 4.4 4.4"/>')}
${s("timer", '<circle cx="12" cy="13.5" r="7"/><path d="M12 10v3.5l2.2 1.4M9.5 3.5h5M12 3.5v3"/>')}
${s("menu", '<path d="M4 7h16M4 12h16M4 17h16"/>')}
${s("cook", '<path d="M4 11h16v2.5a6.5 6.5 0 0 1-6.5 6.5h-3A6.5 6.5 0 0 1 4 13.5Z"/><path d="M2 11h2M20 11h2M9 7.5c0-1.3 1.2-1.7 1.2-3M13.5 7.5c0-1.3 1.2-1.7 1.2-3"/>')}
${s("print", '<path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M7 14.5h10v6H7z"/>')}
${s("mail", '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="m4 7 8 6 8-6"/>')}
${s("youtube", '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.2v5.6l4.8-2.8Z" fill="currentColor"/>')}
${s("spark", '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.6 2.6M15.4 15.4 18 18M18 6l-2.6 2.6M8.6 15.4 6 18"/>')}
${s("leaf", '<path d="M5 19c0-8 5.5-13.5 14-14-.5 8.5-6 14-14 14Z"/><path d="M5 19 13 11"/>')}
${s("basket", '<path d="M3.5 10h17l-1.6 8.3a2 2 0 0 1-2 1.7H7.1a2 2 0 0 1-2-1.7Z"/><path d="m8 10 3-6M16 10l-3-6M9.5 14v2.5M14.5 14v2.5"/>')}
${s("camera", '<path d="M4 8.5a2 2 0 0 1 2-2h1.8l1.5-2h5.4l1.5 2H18a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><circle cx="12" cy="12.6" r="3.4"/>')}
${s("calendar", '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>')}
${s("quote", '<path d="M3 21V12.5C3 7.6 5.6 4.4 10.5 3l.8 2.4C8.4 6.5 7.3 8.6 7.3 11H11v10Zm13 0V12.5c0-4.9 2.6-8.1 7.5-9.5l.8 2.4c-2.9 1.1-4 3.2-4 5.6H24v10Z" fill="currentColor" stroke="none"/>', "0 0 26 22")}
${s("star", '<path d="M12 2.5c.5 5.2 4.3 9 9.5 9.5-5.2.5-9 4.3-9.5 9.5-.5-5.2-4.3-9-9.5-9.5 5.2-.5 9-4.3 9.5-9.5Z" fill="currentColor" stroke="none"/>')}
</svg>`;

export const i = (id, cls = "") => `<svg${cls ? ` class="${cls}"` : ""} aria-hidden="true"><use href="#i-${id}"/></svg>`;
