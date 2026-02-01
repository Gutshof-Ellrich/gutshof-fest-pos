import { toast } from 'sonner';

export type PrintJobStatus = 'pending' | 'printing' | 'success' | 'failed' | 'retrying';

export interface PrintJob {
  id: string;
  printerId: string;
  printerName: string;
  printerIp: string;
  printerPort: number;
  data: string;
  status: PrintJobStatus;
  retries: number;
  maxRetries: number;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface PrintQueueState {
  jobs: PrintJob[];
  isProcessing: boolean;
}

type PrintQueueListener = (state: PrintQueueState) => void;

class PrintQueueManager {
  private jobs: PrintJob[] = [];
  private isProcessing = false;
  private listeners: Set<PrintQueueListener> = new Set();
  private printServerUrl: string | null = null;
  
  constructor() {
    // Try to load print server URL from localStorage
    this.printServerUrl = localStorage.getItem('printServerUrl') || null;
  }
  
  setPrintServerUrl(url: string | null) {
    this.printServerUrl = url;
    if (url) {
      localStorage.setItem('printServerUrl', url);
    } else {
      localStorage.removeItem('printServerUrl');
    }
  }
  
  getPrintServerUrl(): string | null {
    return this.printServerUrl;
  }
  
  subscribe(listener: PrintQueueListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }
  
  private notify() {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }
  
  getState(): PrintQueueState {
    return {
      jobs: [...this.jobs],
      isProcessing: this.isProcessing,
    };
  }
  
  addJob(
    printerId: string,
    printerName: string,
    printerIp: string,
    printerPort: number,
    data: string
  ): string {
    const job: PrintJob = {
      id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      printerId,
      printerName,
      printerIp,
      printerPort,
      data,
      status: 'pending',
      retries: 0,
      maxRetries: 3,
      createdAt: new Date(),
    };
    
    this.jobs.push(job);
    this.notify();
    this.processQueue();
    
    return job.id;
  }
  
  private async processQueue() {
    if (this.isProcessing) return;
    
    const pendingJob = this.jobs.find(j => j.status === 'pending' || j.status === 'retrying');
    if (!pendingJob) return;
    
    this.isProcessing = true;
    pendingJob.status = 'printing';
    this.notify();
    
    try {
      await this.sendToPrinter(pendingJob);
      pendingJob.status = 'success';
      pendingJob.completedAt = new Date();
      toast.success(`Druck erfolgreich: ${pendingJob.printerName}`);
    } catch (error) {
      pendingJob.retries++;
      pendingJob.error = error instanceof Error ? error.message : 'Unbekannter Fehler';
      
      if (pendingJob.retries < pendingJob.maxRetries) {
        pendingJob.status = 'retrying';
        toast.warning(`Druckversuch ${pendingJob.retries}/${pendingJob.maxRetries} für ${pendingJob.printerName}`);
      } else {
        pendingJob.status = 'failed';
        pendingJob.completedAt = new Date();
        toast.error(`Druck fehlgeschlagen: ${pendingJob.printerName}`, {
          description: pendingJob.error,
        });
      }
    }
    
    this.notify();
    this.isProcessing = false;
    
    // Continue processing queue
    setTimeout(() => this.processQueue(), 100);
  }
  
  private async sendToPrinter(job: PrintJob): Promise<void> {
    // If we have a print server URL, use it
    if (this.printServerUrl) {
      const response = await fetch(`${this.printServerUrl}/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ip: job.printerIp,
          port: job.printerPort,
          data: btoa(job.data), // Base64 encode the ESC/POS data
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      return;
    }
    
    // Fallback: Simulate printing (for demo/development)
    await this.simulatePrint(job);
  }
  
  private async simulatePrint(job: PrintJob): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
    
    // Log the receipt content for debugging
    console.log(`[PrintQueue] Simulated print to ${job.printerName} (${job.printerIp}:${job.printerPort})`);
    console.log(`[PrintQueue] Receipt data (${job.data.length} bytes):`, job.data.substring(0, 200) + '...');
    
    // Simulate occasional failures for testing (disabled by default)
    // if (Math.random() < 0.1) {
    //   throw new Error('Simulierter Druckfehler');
    // }
  }
  
  retryJob(jobId: string) {
    const job = this.jobs.find(j => j.id === jobId);
    if (job && job.status === 'failed') {
      job.status = 'retrying';
      job.retries = 0;
      this.notify();
      this.processQueue();
    }
  }
  
  cancelJob(jobId: string) {
    const index = this.jobs.findIndex(j => j.id === jobId);
    if (index !== -1 && this.jobs[index].status === 'pending') {
      this.jobs.splice(index, 1);
      this.notify();
    }
  }
  
  clearCompleted() {
    this.jobs = this.jobs.filter(j => j.status === 'pending' || j.status === 'printing' || j.status === 'retrying');
    this.notify();
  }
  
  clearAll() {
    this.jobs = [];
    this.notify();
  }
}

// Singleton instance
export const printQueue = new PrintQueueManager();
