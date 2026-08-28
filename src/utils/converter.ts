import { IMAGE_URL } from "./config";

export const imgaeUrlConverter = (url: string) => {
  if (!url) return '';

  // If already local file path
  if (url.startsWith('file://')) {
    return url;
  }

  // If already full URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Backend uploaded image path
  return `${IMAGE_URL}/${url.replace(/\\/g, '/')}`;
};

export const onlineCalculator = (data: {
  lastOnline?: Date;
  lastOffline?: Date;
  totalOnlineMinutes: number;
}) => {
  const { lastOnline, lastOffline, totalOnlineMinutes } = data;

  let sessionMinutes = 0;

  if (lastOnline) {
    const currentUTC = Date.now();

    const start = new Date(lastOnline).getTime();

    // 👉 YOUR LOGIC:
    // current time (UTC) - lastOnlineTime
    const diffMs = currentUTC - start;

    sessionMinutes = Math.floor(diffMs / 60000);
  }

  const totalMinutes = totalOnlineMinutes + sessionMinutes;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  console.log(`${hours}h ${minutes}m`);

  return {
    totalMinutes,
    formatted: `${hours}h ${minutes}m`,
    hours,
    minutes,
  };
};

export const fullNameConverter = (firstName: string, lastName: string) => {
  return `${firstName} ${lastName ?? ""}`;
};