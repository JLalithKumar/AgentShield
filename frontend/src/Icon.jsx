// Tiny inline icons keep the dashboard dependency-free and safe for offline demos.
export default function Icon({ name, size = 18, strokeWidth = 1.8 }) {
  const paths = {
    sliders: <><path d="M3 7h8m4 0h6M3 17h3m4 0h11"/><circle cx="13" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></>,
    menu: <path d="M3 6h18M3 12h18M3 18h18"/>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
    building: <><path d="m3 9 9-5 9 5H3Zm2 11h14M7 11v6m5-6v6m5-6v6"/></>,
    box: <><path d="m12 3 9 5v9l-9 5-9-5V8l9-5Zm0 10 9-5m-9 5L3 8m9 5v9"/></>,
    file: <><path d="M14 3H5v18h14V8l-5-5Zm0 0v5h5M8 13h8m-8 4h5"/></>,
    play: <path d="m7 4 13 8-13 8V4Z"/>,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
    eyeOff: <><path d="M10.7 5.1A9.8 9.8 0 0 1 12 5c6 0 10 7 10 7a17.6 17.6 0 0 1-3.3 4.3M6.6 6.6A17.7 17.7 0 0 0 2 12s4 7 10 7a9.7 9.7 0 0 0 4.4-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="m3 3 18 18"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M5 20a7 7 0 0 1 14 0"/></>,
    search: <><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></>,
    chevron: <path d="m9 6 6 6-6 6"/>,
    branch: <><circle cx="7" cy="5" r="2"/><circle cx="17" cy="6" r="2"/><circle cx="7" cy="19" r="2"/><path d="M7 7v10m0-3c6 0 10-2 10-6"/></>,
    shield: <><path d="M12 2.5 20 6v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-3.5Z"/><path d="m9 12 2 2 4-4"/></>,
    command: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    layers: <><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/></>,
    activity: <><path d="M3 12h4l3-7 4 14 3-7h4"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6"/></>,
    pulse: <><path d="M2 12h5l3-6 4 12 3-6h5"/></>,
    check: <><path d="m5 12 4 4L19 6"/></>,
    alert: <><path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v4m0 4h.01"/></>,
    server: <><rect x="3" y="3" width="18" height="7" rx="1.5"/><rect x="3" y="14" width="18" height="7" rx="1.5"/><path d="M7 6.5h.01M7 17.5h.01"/></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.shield}</svg>;
}
