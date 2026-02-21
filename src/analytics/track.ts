export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

export function track(eventName: string, props?: AnalyticsProps): void {
  const payload = props ? JSON.stringify(props) : "";
  console.info(`analytics event=${eventName}${payload ? ` props=${payload}` : ""}`);
}
