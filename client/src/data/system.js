import { Cpu, HardDrive, MemoryStick } from 'lucide-react';

export const systemMetrics = [
  { title: 'Penggunaan CPU', value: '0%', subValue: '', icon: Cpu, progress: 0 },
  { title: 'Memori', value: '0 MB', subValue: '/ 0 MB', icon: MemoryStick, progress: 0 },
  { title: 'Penggunaan Disk', value: 'Belum dibaca', subValue: '', icon: HardDrive, progress: 0 },
];

export const internetSpeed = {
  upload: '-',
  download: '-',
};
