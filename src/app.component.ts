import { ChangeDetectionStrategy, Component, inject, signal, ViewChild, ElementRef, AfterViewInit, OnDestroy, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GeminiService, TarotReading } from './services/gemini.service';
import { DatePipe } from '@angular/common';

interface CalculationResult {
  text: string;
  total: number;
  breakdown: { char: string; value: number }[];
  interpretation: string;
}

interface MostahsalehResult {
  essenceWord: string;
  interpretation: string;
  totalValue: number;
}

type TimeAdjustmentUnit = 'سال' | 'ماه' | 'روز' | 'ساعت' | 'دقیقه';
type ReadingType = 'abjad' | 'astrology' | 'mostahsaleh' | 'tarot' | 'sigil';
type ActiveTab = 'abjad' | 'astrology' | 'mostahsaleh' | 'tarot' | 'sigil';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DatePipe],
  host: {
    '(window:resize)': 'onResize()'
  },
})
export class AppComponent implements AfterViewInit, OnDestroy {
  private geminiService = inject(GeminiService);
  private readonly HISTORY_KEY = 'numerology_history';
  private readonly WELCOME_KEY = 'welcome_shown';
  private readonly MAX_HISTORY_ITEMS = 15;

  // UI State
  activeTab = signal<ActiveTab>('abjad');

  // Commercial/UX Signals
  showWelcomeModal = signal(false);
  isDisclaimerVisible = signal(false);

  // Abjad signals
  userInput = signal('');
  isLoading = signal(false);
  calculationResult = signal<CalculationResult | null>(null);
  history = signal<CalculationResult[]>([]);

  // For Temporal Relay
  adjustedDate = signal(new Date());
  isRelayOpen = signal(false);
  // FIX: Replaced `any` with a specific type for better type safety.
  private timeUpdateInterval: number | undefined;
  private adjustmentInterval: number | undefined;
  private isTimeTraveling = false;
  
  // For Abjad Table Modal
  isTableVisible = signal(false);
  readonly abjadDisplayList = [
    { letters: ['ا', 'أ', 'إ', 'آ'], value: 1 }, { letters: ['ب', 'پ'], value: 2 },
    { letters: ['ج', 'چ'], value: 3 }, { letters: ['د'], value: 4 },
    { letters: ['ه', 'ة'], value: 5 }, { letters: ['و'], value: 6 },
    { letters: ['ز', 'ژ'], value: 7 }, { letters: ['ح'], value: 8 },
    { letters: ['ط'], value: 9 }, { letters: ['ی', 'ي'], value: 10 },
    { letters: ['ک', 'ك', 'گ'], value: 20 }, { letters: ['ل'], value: 30 },
    { letters: ['م'], value: 40 }, { letters: ['ن'], value: 50 },
    { letters: ['س'], value: 60 }, { letters: ['ع'], value: 70 },
    { letters: ['ف'], value: 80 }, { letters: ['ص'], value: 90 },
    { letters: ['ق'], value: 100 }, { letters: ['ر'], value: 200 },
    { letters: ['ش'], value: 300 }, { letters: ['ت'], value: 400 },
    { letters: ['ث'], value: 500 }, { letters: ['خ'], value: 600 },
    { letters: ['ذ'], value: 700 }, { letters: ['ض'], value: 800 },
    { letters: ['ظ'], value: 900 }, { letters: ['غ'], value: 1000 },
  ];

  // For Astrology Panel
  isAstrologyLoading = signal(false);
  astrologicalReading = signal<string | null>(null);
  birthDay = signal<number | null>(null);
  birthMonth = signal<number | null>(null);
  birthYear = signal<number | null>(null);
  gender = signal<'زن' | 'مرد' | null>(null);
  
  readonly days = Array.from({ length: 31 }, (_, i) => i + 1);
  readonly months = [
    { name: 'فروردین', value: 1 }, { name: 'اردیبهشت', value: 2 }, { name: 'خرداد', value: 3 },
    { name: 'تیر', value: 4 }, { name: 'مرداد', value: 5 }, { name: 'شهریور', value: 6 },
    { name: 'مهر', value: 7 }, { name: 'آبان', value: 8 }, { name: 'آذر', value: 9 },
    { name: 'دی', value: 10 }, { name: 'بهمن', value: 11 }, { name: 'اسفند', value: 12 }
  ];

  // For Mostahsaleh Panel
  isMostahsalehLoading = signal(false);
  mostahsalehResult = signal<MostahsalehResult | null>(null);
  userName = signal('');
  motherName = signal('');

  // For Tarot Panel
  isTarotLoading = signal(false);
  tarotQuestion = signal('');
  tarotReading = signal<TarotReading | null>(null);

  // For Sigil Panel
  isSigilLoading = signal(false);
  sigilIntent = signal('');
  sigilInterpretation = signal<string | null>(null);
  @ViewChild('sigilCanvas') sigilCanvasRef!: ElementRef<HTMLCanvasElement>;
  private sigilDigits: number[] = [];


  // For Matrix background
  @ViewChild('matrixCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private drops: number[] = [];
  // FIX: Replaced `any` with a specific type for better type safety.
  private matrixAnimationInterval: number | undefined;

  private abjadMap: { [key: string]: number } = {
    'ا': 1, 'أ': 1, 'إ': 1, 'آ': 1, 'ب': 2, 'پ': 2, 'ج': 3, 'چ': 3, 'د': 4,
    'ه': 5, 'ة': 5, 'و': 6, 'ز': 7, 'ژ': 7, 'ح': 8, 'ط': 9, 'ی': 10, 'ي': 10,
    'ک': 20, 'ك': 20, 'گ': 20, 'ل': 30, 'م': 40, 'ن': 50, 'س': 60, 'ع': 70,
    'ف': 80, 'ص': 90, 'ق': 100, 'ر': 200, 'ش': 300, 'ت': 400, 'ث': 500,
    'خ': 600, 'ذ': 700, 'ض': 800, 'ظ': 900, 'غ': 1000,
  };

  constructor() {
    this.loadHistory();
    effect(() => {
      if (this.sigilInterpretation() && this.sigilCanvasRef) {
        // Redraw the sigil when the view updates after the interpretation is loaded
        setTimeout(() => this.drawSigil(), 0);
      }
    });
  }

  ngAfterViewInit(): void {
    this.setupMatrixAndTimers();
    
    // Show welcome modal on the first-ever visit
    if (typeof localStorage !== 'undefined') {
      const welcomeShown = localStorage.getItem(this.WELCOME_KEY);
      if (!welcomeShown) {
        this.showWelcomeModal.set(true);
      }
    }
  }

  ngOnDestroy(): void {
    if (this.matrixAnimationInterval) clearInterval(this.matrixAnimationInterval);
    if (this.timeUpdateInterval) clearInterval(this.timeUpdateInterval);
    if (this.adjustmentInterval) clearInterval(this.adjustmentInterval);
  }

  onResize(): void { this.setupMatrix(); }

  private setupMatrixAndTimers(): void {
    // We need a slight delay for the canvas to be available in the DOM
    setTimeout(() => {
        if (this.canvasRef) {
            this.setupMatrix();
            this.matrixAnimationInterval = setInterval(() => this.drawMatrix(), 50);
        }
        this.startTimeUpdates();
    }, 0);
  }
  
  selectTab(tab: ActiveTab): void {
    this.activeTab.set(tab);
  }
  
  closeWelcomeModal(): void {
    this.showWelcomeModal.set(false);
    localStorage.setItem(this.WELCOME_KEY, 'true');
  }

  private setupMatrix(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const columns = Math.floor(canvas.width / 20);
    this.drops = Array(columns).fill(1);
  }

  private drawMatrix(): void {
    this.ctx.fillStyle = 'rgba(17, 24, 39, 0.1)';
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.fillStyle = '#06b6d4';
    this.ctx.font = '15px monospace';
    for (let i = 0; i < this.drops.length; i++) {
      const text = Math.random() > 0.5 ? '1' : '0';
      this.ctx.fillText(text, i * 20, this.drops[i] * 20);
      if (this.drops[i] * 20 > this.ctx.canvas.height && Math.random() > 0.975) {
        this.drops[i] = 0;
      }
      this.drops[i]++;
    }
  }

  async calculate() {
    const text = this.userInput().trim();
    if (!text || this.isLoading()) return;
    this.isLoading.set(true);
    this.calculationResult.set(null);
    let total = 0;
    const breakdown: { char: string; value: number }[] = [];
    // FIX: The for...of loop was causing a type inference issue where `char` was incorrectly typed as 'unknown'.
    // A traditional for loop ensures `char` is correctly inferred as a string.
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const charValue = this.abjadMap[char];
      if (charValue) {
        total += charValue;
        breakdown.push({ char, value: charValue });
      } else if (char !== ' ') {
        breakdown.push({ char, value: 0 });
      }
    }
    try {
      const interpretation = await this.geminiService.getInterpretation(text, total);
      const result: CalculationResult = { text, total, breakdown, interpretation };
      this.calculationResult.set(result);
      this.addToHistory(result);
    } catch (error) {
      console.error('Failed to get interpretation:', error);
      this.calculationResult.set({
        text, total, breakdown,
        interpretation: 'خطا در دریافت تفسیر. لطفا دوباره تلاش کنید.',
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  selectHistoryItem(item: CalculationResult): void {
    this.userInput.set(item.text);
    this.calculationResult.set(item);
    document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
  }

  clearHistory(): void {
    this.history.set([]);
    localStorage.removeItem(this.HISTORY_KEY);
  }

  private loadHistory(): void {
    const storedHistory = localStorage.getItem(this.HISTORY_KEY);
    if (storedHistory) {
      try { this.history.set(JSON.parse(storedHistory)); }
      catch (e) { console.error('Error parsing history from localStorage', e); }
    }
  }

  private saveHistory(): void { localStorage.setItem(this.HISTORY_KEY, JSON.stringify(this.history())); }

  private addToHistory(result: CalculationResult): void {
    this.history.update(current => [result, ...current.filter(item => item.text !== result.text)].slice(0, this.MAX_HISTORY_ITEMS));
    this.saveHistory();
  }

  startTimeUpdates(): void {
    if (this.timeUpdateInterval) clearInterval(this.timeUpdateInterval);
    this.timeUpdateInterval = setInterval(() => { if (!this.isTimeTraveling) this.adjustedDate.set(new Date()); }, 1000);
  }

  toggleRelay(): void { this.isRelayOpen.update(v => !v); }

  adjustTime(unit: TimeAdjustmentUnit, amount: number): void {
    this.isTimeTraveling = true;
    this.adjustedDate.update(d => {
      const newDate = new Date(d);
      switch (unit) {
        case 'سال': newDate.setFullYear(newDate.getFullYear() + amount); break;
        case 'ماه': newDate.setMonth(newDate.getMonth() + amount); break;
        case 'روز': newDate.setDate(newDate.getDate() + amount); break;
        case 'ساعت': newDate.setHours(newDate.getHours() + amount); break;
        case 'دقیقه': newDate.setMinutes(newDate.getMinutes() + amount); break;
      }
      return newDate;
    });
  }

  startAdjusting(unit: TimeAdjustmentUnit, amount: number): void {
    this.stopAdjusting();
    this.adjustTime(unit, amount);
    this.adjustmentInterval = setInterval(() => this.adjustTime(unit, amount), 100);
  }

  stopAdjusting(): void { if (this.adjustmentInterval) clearInterval(this.adjustmentInterval); }

  resetToPresent(): void { this.isTimeTraveling = false; }

  toggleTable(): void { this.isTableVisible.update(v => !v); }

  async generateAstrologicalReading() {
    const day = this.birthDay(), month = this.birthMonth(), year = this.birthYear(), gender = this.gender();
    if (!day || !month || !year || !gender) return;
    this.isAstrologyLoading.set(true);
    this.astrologicalReading.set(null);
    try {
      this.astrologicalReading.set(await this.geminiService.getAstrologicalReading(day, month, year, gender));
    } catch (error) {
      console.error('Failed to get astrological reading:', error);
      this.astrologicalReading.set('خطا در ارتباط با کائنات. لطفاً لحظاتی دیگر دوباره تلاش کنید.');
    } finally {
      this.isAstrologyLoading.set(false);
    }
  }
  
  async generateMostahsalehAnalysis() {
    const userName = this.userName().trim(), motherName = this.motherName().trim();
    if (!userName || !motherName) return;
    this.isMostahsalehLoading.set(true);
    this.mostahsalehResult.set(null);
    try {
      this.mostahsalehResult.set(await this.geminiService.getMostahsalehAnalysis(userName, motherName));
    } catch (error) {
      console.error('Failed to get Mostahsaleh analysis:', error);
      this.mostahsalehResult.set({
        essenceWord: 'خطا',
        interpretation: 'خطا در مکاشفه. نیروهای کیهانی در حال حاضر آشفته هستند. لطفاً بعداً دوباره تلاش کنید.',
        totalValue: 0
      });
    } finally {
      this.isMostahsalehLoading.set(false);
    }
  }

  async drawTarotCard() {
    const question = this.tarotQuestion().trim();
    if (!question) return;
    this.isTarotLoading.set(true);
    this.tarotReading.set(null);
    try {
      this.tarotReading.set(await this.geminiService.getTarotReading(question));
    } catch (error) {
      console.error('Failed to get Tarot reading:', error);
      this.tarotReading.set({
        card: 'کارت سوخته',
        interpretation: 'خطا در ارتباط با اوراکل. به نظر می‌رسد حجاب‌های اثیری ضخیم هستند. لطفاً بعداً دوباره تلاش کنید.'
      });
    } finally {
      this.isTarotLoading.set(false);
    }
  }

  async generateSigil() {
    const intent = this.sigilIntent().trim();
    if (!intent) return;
    this.isSigilLoading.set(true);
    this.sigilInterpretation.set(null);

    // 1. Convert intent to abjad digits
    // FIX: The `[...new Set(string)]` construct was causing a type inference issue, resulting in `char` being `unknown`.
    // Replaced with a type-safe method using `filter` to get unique characters.
    const uniqueChars = intent.replace(/\s/g, '').split('').filter((char, index, self) => self.indexOf(char) === index);
    const abjadValues: number[] = [];
    for (let i = 0; i < uniqueChars.length; i++) {
      const char = uniqueChars[i];
      abjadValues.push(this.abjadMap[char] || 0);
    }
    const allDigits = abjadValues.join('').split('').map(Number);
    this.sigilDigits = allDigits.filter((digit, index) => index === 0 || digit !== allDigits[index-1]);
    if (this.sigilDigits.length < 2) {
        this.sigilDigits.push((this.sigilDigits[0] + 1) % 10); // Ensure at least two points to draw a line
    }

    try {
      this.sigilInterpretation.set(await this.geminiService.getSigilInterpretation(intent));
    } catch (error) {
      console.error('Failed to get Sigil interpretation:', error);
      this.sigilInterpretation.set('خطا در ارتباط با معمار کیهانی. لطفاً بعداً دوباره تلاش کنید.');
    } finally {
      this.isSigilLoading.set(false);
    }
  }

  private drawSigil(): void {
    if (!this.sigilCanvasRef || this.sigilDigits.length === 0) return;
    const canvas = this.sigilCanvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const center = { x: width / 2, y: height / 2 };
    const radius = width / 2 * 0.8;

    // Define 10 points on a circle for digits 0-9
    const points = Array.from({ length: 10 }, (_, i) => {
      const angle = (i / 10) * 2 * Math.PI - (Math.PI / 2); // Start from top
      return {
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle)
      };
    });

    ctx.clearRect(0, 0, width, height);

    // Draw background grid
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 10; i++) {
        ctx.beginPath();
        ctx.moveTo(i * width/10, 0);
        ctx.lineTo(i * width/10, height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * height/10);
        ctx.lineTo(width, i * height/10);
        ctx.stroke();
    }

    // Draw the sigil
    ctx.beginPath();
    const startPoint = points[this.sigilDigits[0]];
    ctx.moveTo(startPoint.x, startPoint.y);

    for (let i = 1; i < this.sigilDigits.length; i++) {
      const point = points[this.sigilDigits[i]];
      ctx.lineTo(point.x, point.y);
    }

    ctx.strokeStyle = '#67e8f9'; // cyan-300
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#22d3ee'; // cyan-400
    ctx.shadowBlur = 15;
    ctx.stroke();

    // Reset shadow for other drawings
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  exportReading(type: ReadingType): void {
    const content = this.generatePrintContent(type);
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(content);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500); // Wait for content to render
    }
  }

  private generatePrintContent(type: ReadingType): string | null {
    let title = '', body = '';
    const date = new Date().toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });

    switch (type) {
      case 'abjad':
        const result = this.calculationResult();
        if (!result) return null;
        title = 'تحلیل ابجد';
        body = `
          <h2>برای عبارت: "${result.text}"</h2>
          <div class="section">
            <h3>مقدار عددی کل (ابجد)</h3>
            <p class="total">${result.total}</p>
          </div>
          <div class="section">
            <h3>تفسیر عدد</h3>
            <p>${result.interpretation}</p>
          </div>
        `;
        break;
      
      case 'astrology':
        const reading = this.astrologicalReading();
        if (!reading) return null;
        title = 'تحلیل مسیر زندگی';
        body = `
          <div class="section">
            <h3>پیام کائنات برای شما</h3>
            <p class="whitespace-pre-wrap">${reading}</p>
          </div>
        `;
        break;

      case 'mostahsaleh':
        const mostahsaleh = this.mostahsalehResult();
        if (!mostahsaleh) return null;
        title = 'تحلیل مستحصله';
        body = `
          <h2>برای: ${this.userName()} (فرزند ${this.motherName()})</h2>
          <div class="section">
            <h3>مقدار ابجد کل</h3>
            <p class="total">${mostahsaleh.totalValue}</p>
          </div>
          <div class="section">
            <h3>کلمه جوهر</h3>
            <p class="total essence-word">${mostahsaleh.essenceWord}</p>
          </div>
          <div class="section">
            <h3>تفسیر کلمه جوهر</h3>
            <p>${mostahsaleh.interpretation}</p>
          </div>
        `;
        break;
      
      case 'tarot':
        const tarot = this.tarotReading();
        if (!tarot) return null;
        title = 'فال تاروت';
        body = `
          <h2>برای نیت: "${this.tarotQuestion()}"</h2>
          <div class="section">
            <h3>کارت شما</h3>
            <p class="total tarot-card">${tarot.card}</p>
          </div>
          <div class="section">
            <h3>تفسیر کارت</h3>
            <p class="whitespace-pre-wrap">${tarot.interpretation}</p>
          </div>
        `;
        break;

      case 'sigil':
        const intent = this.sigilIntent();
        const interpretation = this.sigilInterpretation();
        if (!intent || !interpretation || !this.sigilCanvasRef) return null;
        const canvas = this.sigilCanvasRef.nativeElement;
        const sigilImage = canvas.toDataURL('image/png');
        title = 'لوح کیهانی';
        body = `
          <h2>برای نیت: "${intent}"</h2>
          <div class="section" style="text-align: center;">
            <h3>لوح کیهانی شما</h3>
            <img src="${sigilImage}" alt="لوح کیهانی" style="max-width: 300px; margin: 1rem auto; border: 1px solid #ddd; border-radius: 8px;">
          </div>
          <div class="section">
            <h3>تفسیر معمار کیهانی</h3>
            <p class="whitespace-pre-wrap">${interpretation}</p>
          </div>
        `;
        break;
    }

    return `
      <html>
        <head>
          <title>${title} - پنل اسطوره</title>
          <style>
            @font-face {
              font-family: 'Vazirmatn';
              src: url('https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@33.003/Vazirmatn-Regular.woff2') format('woff2');
              font-weight: normal;
              font-style: normal;
            }
            body { 
              font-family: 'Vazirmatn', sans-serif; 
              direction: rtl; 
              text-align: right; 
              margin: 2rem;
              color: #333;
            }
            .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 1rem; margin-bottom: 2rem; }
            .header h1 { margin: 0; color: #555; }
            h2 { color: #777; font-size: 1.2rem; }
            h3 { color: #008B8B; border-bottom: 1px solid #ddd; padding-bottom: 0.5rem; margin-top: 2rem; }
            .section { background-color: #f9f9f9; border: 1px solid #eee; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
            .total { font-size: 3rem; font-weight: bold; color: #005f5f; text-align: center; margin: 1rem 0; }
            .essence-word { color: #b8860b; }
            .tarot-card { color: #4b0082; }
            p { line-height: 1.8; font-size: 1.1rem; }
            .whitespace-pre-wrap { white-space: pre-wrap; }
            .footer { text-align: center; margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #eee; font-size: 0.9rem; color: #888; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>پنل اسطوره</h1>
            <p>تحلیل استخراج شده در تاریخ: ${date}</p>
          </div>
          ${body}
          <div class="footer">
            <p>ساخته شده توسط یاسین کیانی فر</p>
            <p>این تحلیل برای راهنمایی و خودشناسی است و نباید به عنوان پیش‌گویی قطعی در نظر گرفته شود.</p>
          </div>
        </body>
      </html>
    `;
  }
}
