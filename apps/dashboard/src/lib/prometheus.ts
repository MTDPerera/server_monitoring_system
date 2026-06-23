import axios, { AxiosRequestConfig } from 'axios';

interface PrometheusSource {
  name: string;
  label: string;
  url: string;
  user?: string;
  pass?: string;
}

export interface MetricResult {
  network: string;
  networkLabel: string;
  metric: Record<string, string>;
  value: string;
  timestamp: number;
}

export interface TargetInfo {
  network: string;
  networkLabel: string;
  instance: string;
  job: string;
  health: 'up' | 'down' | 'unknown';
  lastScrape: string;
  lastError: string;
  labels: Record<string, string>;
}

export interface NetworkStats {
  network: string;
  label: string;
  up: number;
  down: number;
  total: number;
  healthy: number;
  online: boolean;
  error?: string;
}

function getSources(): PrometheusSource[] {
  return [
    {
      name: 'network1',
      label: process.env.PROM_NET1_LABEL || 'Physical Servers',
      url: process.env.PROM_NET1_URL || '',
      user: process.env.PROM_NET1_USER,
      pass: process.env.PROM_NET1_PASS,
    },
    {
      name: 'hetzner',
      label: process.env.PROM_NET2_LABEL || 'Hetzner Bare-Metal',
      url: process.env.PROM_NET2_URL || '',
      user: process.env.PROM_NET2_USER,
      pass: process.env.PROM_NET2_PASS,
    },
    {
      name: 'network3',
      label: process.env.PROM_NET3_LABEL || 'Third Network',
      url: process.env.PROM_NET3_URL || '',
      user: process.env.PROM_NET3_USER,
      pass: process.env.PROM_NET3_PASS,
    },
  ].filter((s) => !!s.url);
}

function makeConfig(source: PrometheusSource): AxiosRequestConfig {
  return {
    timeout: 8000,
    auth:
      source.user && source.pass
        ? { username: source.user, password: source.pass }
        : undefined,
  };
}

export async function queryAll(promql: string): Promise<MetricResult[]> {
  const sources = getSources();
  const results = await Promise.allSettled(
    sources.map((s) =>
      axios
        .get(`${s.url}/api/v1/query`, {
          ...makeConfig(s),
          params: { query: promql },
        })
        .then((res) =>
          (
            res.data.data.result as Array<{
              metric: Record<string, string>;
              value: [number, string];
            }>
          ).map((r) => ({
            network: s.name,
            networkLabel: s.label,
            metric: r.metric,
            value: r.value[1],
            timestamp: r.value[0],
          }))
        )
    )
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<MetricResult[]> =>
        r.status === 'fulfilled'
    )
    .flatMap((r) => r.value);
}

export async function getTargets(): Promise<TargetInfo[]> {
  const sources = getSources();
  const results = await Promise.allSettled(
    sources.map((s) =>
      axios
        .get(`${s.url}/api/v1/targets`, makeConfig(s))
        .then((res) =>
          (
            res.data.data.activeTargets as Array<{
              labels: Record<string, string>;
              health: string;
              lastScrape: string;
              lastError: string;
              scrapeUrl: string;
            }>
          ).map((t) => ({
            network: s.name,
            networkLabel: s.label,
            instance: t.labels.instance || t.scrapeUrl,
            job: t.labels.job || 'unknown',
            health: t.health as 'up' | 'down' | 'unknown',
            lastScrape: t.lastScrape,
            lastError: t.lastError,
            labels: t.labels,
          }))
        )
    )
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<TargetInfo[]> => r.status === 'fulfilled'
    )
    .flatMap((r) => r.value);
}

export interface ServerMetrics {
  instance: string;
  network: string;
  cpu: string | null;
  memoryPct: string | null;
  memoryTotal: string | null;
  memoryUsed: string | null;
  diskPct: string | null;
  diskTotal: string | null;
  diskUsed: string | null;
  load1: string | null;
  load5: string | null;
  load15: string | null;
  uptime: string | null;
  netRx: string | null;
  netTx: string | null;
}

export async function getServerMetrics(instance: string, network: string): Promise<ServerMetrics> {
  const source = getSources().find((s) => s.name === network);
  if (!source) throw new Error(`Unknown network: ${network}`);

  const config = makeConfig(source);
  const q = (query: string) =>
    axios
      .get(`${source.url}/api/v1/query`, { ...config, params: { query } })
      .then((r) => {
        const result = r.data.data.result;
        if (Array.isArray(result) && result.length > 0) return result[0].value[1] as string;
        return null;
      })
      .catch(() => null);

  const i = instance;
  const [cpu, memPct, memTotal, memAvail, diskPct, diskTotal, diskAvail, load1, load5, load15, uptime, netRx, netTx] =
    await Promise.all([
      q(`100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle",instance="${i}"}[5m])) * 100)`),
      q(`(1 - node_memory_MemAvailable_bytes{instance="${i}"} / node_memory_MemTotal_bytes{instance="${i}"}) * 100`),
      q(`node_memory_MemTotal_bytes{instance="${i}"}`),
      q(`node_memory_MemAvailable_bytes{instance="${i}"}`),
      q(`max by(instance) ((1 - node_filesystem_avail_bytes{instance="${i}",mountpoint="/",fstype!~"tmpfs|rootfs|overlay|squashfs|devtmpfs"} / node_filesystem_size_bytes{instance="${i}",mountpoint="/",fstype!~"tmpfs|rootfs|overlay|squashfs|devtmpfs"}) * 100)`),
      q(`max by(instance) (node_filesystem_size_bytes{instance="${i}",mountpoint="/",fstype!~"tmpfs|rootfs|overlay|squashfs|devtmpfs"})`),
      q(`max by(instance) (node_filesystem_avail_bytes{instance="${i}",mountpoint="/",fstype!~"tmpfs|rootfs|overlay|squashfs|devtmpfs"})`),
      q(`node_load1{instance="${i}"}`),
      q(`node_load5{instance="${i}"}`),
      q(`node_load15{instance="${i}"}`),
      q(`(node_time_seconds{instance="${i}"} - node_boot_time_seconds{instance="${i}"})`),
      q(`sum by(instance) (rate(node_network_receive_bytes_total{instance="${i}",device!="lo"}[5m]))`),
      q(`sum by(instance) (rate(node_network_transmit_bytes_total{instance="${i}",device!="lo"}[5m]))`),
    ]);

  const used = memTotal && memAvail
    ? String(parseFloat(memTotal) - parseFloat(memAvail))
    : null;
  const diskUsed = diskTotal && diskAvail
    ? String(parseFloat(diskTotal) - parseFloat(diskAvail))
    : null;

  return { instance, network, cpu, memoryPct: memPct, memoryTotal: memTotal, memoryUsed: used, diskPct, diskTotal, diskUsed, diskAvail, load1, load5, load15, uptime, netRx, netTx };
}

export interface DiskInfo {
  mountpoint: string;
  device: string;
  fstype: string;
  sizeBytes: number;
  usedBytes: number;
  availBytes: number;
  usePct: number;
}

export interface CpuCore {
  core: string;
  usagePct: number;
}

export interface NetworkInterface {
  device: string;
  rxBytesPerSec: number;
  txBytesPerSec: number;
}

export interface ServerDetail {
  disks: DiskInfo[];
  cpuCores: CpuCore[];
  networkInterfaces: NetworkInterface[];
}

type PromResult = Array<{ metric: Record<string, string>; value: [number, string] }>;

export async function getServerDetail(instance: string, network: string): Promise<ServerDetail> {
  const source = getSources().find((s) => s.name === network);
  if (!source) throw new Error(`Unknown network: ${network}`);

  const config = makeConfig(source);
  const qAll = (query: string): Promise<PromResult> =>
    axios
      .get(`${source.url}/api/v1/query`, { ...config, params: { query } })
      .then((r) => r.data.data.result as PromResult)
      .catch(() => []);

  const fsFilter = `fstype!~"tmpfs|rootfs|overlay|squashfs|devtmpfs|cgroup|proc|sysfs|debugfs|tracefs|bpf"`;

  const [diskSize, diskAvail, cpuUsage, netRx, netTx] = await Promise.all([
    qAll(`node_filesystem_size_bytes{instance="${instance}",${fsFilter}}`),
    qAll(`node_filesystem_avail_bytes{instance="${instance}",${fsFilter}}`),
    qAll(`100 - (rate(node_cpu_seconds_total{mode="idle",instance="${instance}"}[5m]) * 100)`),
    qAll(`rate(node_network_receive_bytes_total{instance="${instance}",device!="lo"}[5m])`),
    qAll(`rate(node_network_transmit_bytes_total{instance="${instance}",device!="lo"}[5m])`),
  ]);

  const disks: DiskInfo[] = diskSize
    .map((s) => {
      const avail = diskAvail.find((a) => a.metric.mountpoint === s.metric.mountpoint);
      const sizeBytes = parseFloat(s.value[1]);
      const availBytes = avail ? parseFloat(avail.value[1]) : 0;
      const usedBytes = sizeBytes - availBytes;
      return {
        mountpoint: s.metric.mountpoint,
        device: s.metric.device,
        fstype: s.metric.fstype,
        sizeBytes,
        usedBytes,
        availBytes,
        usePct: sizeBytes > 0 ? (usedBytes / sizeBytes) * 100 : 0,
      };
    })
    .sort((a, b) => a.mountpoint.localeCompare(b.mountpoint));

  const cpuCores: CpuCore[] = cpuUsage
    .map((r) => ({
      core: r.metric.cpu || '0',
      usagePct: Math.max(0, Math.min(100, parseFloat(r.value[1]))),
    }))
    .sort((a, b) => parseInt(a.core) - parseInt(b.core));

  const networkInterfaces: NetworkInterface[] = netRx.map((r) => {
    const tx = netTx.find((t) => t.metric.device === r.metric.device);
    return {
      device: r.metric.device,
      rxBytesPerSec: parseFloat(r.value[1]),
      txBytesPerSec: tx ? parseFloat(tx.value[1]) : 0,
    };
  });

  return { disks, cpuCores, networkInterfaces };
}

export async function getNetworkStats(): Promise<NetworkStats[]> {
  const sources = getSources();
  const results = await Promise.allSettled(
    sources.map(async (s) => {
      const res = await axios.get(`${s.url}/api/v1/targets`, makeConfig(s));
      const targets = res.data.data.activeTargets as Array<{ health: string }>;
      const up = targets.filter((t) => t.health === 'up').length;
      const down = targets.filter((t) => t.health !== 'up').length;
      return {
        network: s.name,
        label: s.label,
        up,
        down,
        total: targets.length,
        healthy: targets.length > 0 ? Math.round((up / targets.length) * 100) : 0,
        online: true,
      };
    })
  );

  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    const err = r.reason as Error;
    return {
      network: sources[i].name,
      label: sources[i].label,
      up: 0,
      down: 0,
      total: 0,
      healthy: 0,
      online: false,
      error: err?.message,
    };
  });
}
