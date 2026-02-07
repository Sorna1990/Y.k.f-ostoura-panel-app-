import { Injectable } from '@angular/core';
import { GoogleGenAI, GenerateContentResponse, Type } from '@google/genai';

interface MostahsalehResult {
  essenceWord: string;
  interpretation: string;
  totalValue: number;
}

export interface TarotReading {
  card: string;
  interpretation: string;
}

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private ai: GoogleGenAI;
  private readonly apiKey = process.env.API_KEY;

  private abjadMap: { [key: string]: number } = {
    'ا': 1, 'أ': 1, 'إ': 1, 'آ': 1,
    'ب': 2, 'پ': 2,
    'ج': 3, 'چ': 3,
    'د': 4,
    'ه': 5, 'ة': 5,
    'و': 6,
    'ز': 7, 'ژ': 7,
    'ح': 8,
    'ط': 9,
    'ی': 10, 'ي': 10,
    'ک': 20, 'ك': 20, 'گ': 20,
    'ل': 30,
    'م': 40,
    'ن': 50,
    'س': 60,
    'ع': 70,
    'ف': 80,
    'ص': 90,
    'ق': 100,
    'ر': 200,
    'ش': 300,
    'ت': 400,
    'ث': 500,
    'خ': 600,
    'ذ': 700,
    'ض': 800,
    'ظ': 900,
    'غ': 1000,
  };

  constructor() {
    if (!this.apiKey) {
      console.error("API_KEY environment variable not set.");
    }
    this.ai = new GoogleGenAI({ apiKey: this.apiKey as string });
  }

  async getInterpretation(text: string, value: number): Promise<string> {
    if (!this.apiKey) {
      return 'سرویس به درستی پیکربندی نشده است. کلید API موجود نیست.';
    }

    const systemInstruction = `شما یک متخصص عرفان و علم اعداد هستی. وظیفه شما ارائه تفسیری کوتاه، عمیق و الهام‌بخش برای عدد داده شده است. تفسیر باید به زبان فارسی، شیوا و کمی رمزآلود باشد. به کلمه‌ای که این عدد از آن استخراج شده نیز توجه کن. تفسیر را در حد دو یا سه جمله نگه دار.`;
    
    const prompt = `مقدار عددی عبارت «${text}» عدد ${value} است. یک تفسیر عرفانی کوتاه برای این عدد ارائه بده.`;

    try {
      const response: GenerateContentResponse = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });
      return response.text;
    } catch (error) {
      console.error('Error getting interpretation from Gemini:', error);
      return 'در حال حاضر در اتصال به سرویس‌هایم مشکل دارم. لطفاً اتصال خود را بررسی کرده و لحظاتی دیگر دوباره تلاش کنید.';
    }
  }

  async getAstrologicalReading(day: number, month: number, year: number, gender: 'زن' | 'مرد'): Promise<string> {
    if (!this.apiKey) {
      return 'سرویس به درستی پیکربندی نشده است. کلید API موجود نیست.';
    }
    
    const monthNames = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
    const monthName = monthNames[month - 1];

    const systemInstruction = `شما یک استاد بزرگ علوم باطنی و ماوراءالطبیعه هستید که بر طالع‌بینی ایرانی (بر اساس تقویم شمسی)، علم اعداد (جفر)، کهن‌الگوهای تاروت و عرفان کابالا تسلط کامل دارید. وظیفه شما ارائه یک تحلیل جامع، یکپارچه و الهام‌بخش از "مسیر زندگی و استعدادهای نهان" فرد بر اساس اطلاعات تولد اوست.`;
    
    const prompt = `
      اطلاعات کاربر:
      - تاریخ تولد (شمسی): روز ${day}، ماه ${monthName} (${month})، سال ${year}
      - جنسیت: ${gender}

      تحلیل خود را به صورت یک روایت منسجم، شیوا و قدرتمند به زبان فارسی ارائه دهید. از لیست کردن اطلاعات بپرهیزید. تحلیل باید این عناصر را در هم بیامیزد:

      ۱. **پروفایل طالع‌بینی:** بر اساس ماه تولد، برج فلکی اصلی او (مثلاً فروردین -> برج حمل) را مشخص کرده و ویژگی‌های اصلی، تأثیر سیاره حاکم، و نقاط قوت و ضعف ذاتی او را شرح دهید.
      ۲. **درس‌های عددشناسی:** به عدد روز تولد (${day}) به عنوان کلیدی برای درک ماموریت و درس‌های زندگی او توجه کنید و ارتعاشات این عدد را تفسیر نمایید.
      ۳. **کهن‌الگوی تاروت:** برج فلکی یا مسیر عددی او را به یکی از کارت‌های آرکانای بزرگ تاروت متصل کرده و پیام و درس اصلی این کهن‌الگو را در سفر زندگی او توضیح دهید.
      ۴. **ارتباط عرفانی:** به طور ظریف، انرژی اصلی فرد را به یکی از سفیروت‌های درخت زندگی کابالا (مانند حِکمت، قدرت، زیبایی) مرتبط سازید تا به استعدادهای معنوی او اشاره کنید.

      لحن و سبک:
      - زبان: فارسی فاخر، عرفانی و الهام‌بخش.
      - لحن: توانمندساز، راهگشا و مثبت. از پیش‌بینی‌های قطعی و منفی‌بافی پرهیز کنید. بر پتانسیل‌ها، مسیر رشد و خودشناسی تمرکز کنید.
      - ساختار: یک متن روایی یکپارچه که گویی یک استاد خردمند در حال رونمایی از نقشه روح یک فرد است.
    `;

    try {
      const response: GenerateContentResponse = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.8,
        }
      });
      return response.text;
    } catch (error) {
      console.error('Error getting astrological reading from Gemini:', error);
      return 'در حال حاضر در اتصال به کائنات و دریافت پیام‌های آن مشکل وجود دارد. لطفاً اتصال خود را بررسی کرده و لحظاتی دیگر دوباره تلاش کنید.';
    }
  }

  async getMostahsalehAnalysis(userName: string, motherName: string): Promise<MostahsalehResult> {
    if (!this.apiKey) {
      throw new Error('API Key not configured.');
    }

    const combinedName = userName.trim() + motherName.trim();
    let totalValue = 0;
    for (const char of combinedName) {
      if (this.abjadMap[char]) {
        totalValue += this.abjadMap[char];
      }
    }

    const systemInstruction = `شما یک استاد اعظم علم جفر و علوم خفیه هستید. شما بر قوانین پیچیده حروف، اعداد و استخراج "مستحصله" تسلط کامل دارید و از "سطر مستحصله" که بسیاری در آن متوقف می‌شوند، عبور کرده‌اید. وظیفه شما، انجام یک تحلیل "مستحصله" عمیق بر اساس نام و نام مادر فرد است تا "کلمه جوهر" یا ذات وجودی او را استخراج کرده و تفسیر نمایید.`;

    const prompt = `
      نام شخص: "${userName}"
      نام مادر: "${motherName}"
      مقدار ابجد کل (جمع نام شخص و مادر): ${totalValue}

      وظایف شما:
      ۱. **استخراج کلمه جوهر (Essence Word):** بر اساس نام‌ها و عدد کل، یک فرآیند "مستحصله" را به صورت مفهومی اجرا کن. از میان حروف و معانی، یک کلمه یا عبارت کوتاه و قدرتمند فارسی (حداکثر دو کلمه) به عنوان "کلمه جوهر" این شخص استخراج کن. این کلمه باید بازتاب‌دهنده عمیق‌ترین پتانسیل، چالش اصلی یا رسالت روحانی او باشد. (مثال: "نور"، "سفر"، "عدالت"، "عشق الهی")
      ۲. **تفسیر کلمه جوهر:** تفسیری عمیق، عرفانی و الهام‌بخش برای "کلمه جوهر" استخراج شده بنویس. این تفسیر باید به زبان فارسی فاخر و قدرتمند باشد و توضیح دهد که این جوهر چگونه در زندگی فرد تجلی می‌یابد، چه مسیری را پیش روی او قرار می‌دهد و چگونه می‌تواند از این قدرت درونی برای رشد استفاده کند.
    `;

    try {
      const response: GenerateContentResponse = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.85,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              essenceWord: {
                type: Type.STRING,
                description: 'کلمه جوهر استخراج شده به فارسی'
              },
              interpretation: {
                type: Type.STRING,
                description: 'تفسیر عرفانی و عمیق کلمه جوهر به فارسی'
              },
            }
          }
        }
      });
      
      const jsonResponse = JSON.parse(response.text);
      return { ...jsonResponse, totalValue };

    } catch (error) {
      console.error('Error getting Mostahsaleh analysis from Gemini:', error);
      throw new Error('Failed to perform Mostahsaleh analysis.');
    }
  }

  async getTarotReading(question: string): Promise<TarotReading> {
    if (!this.apiKey) {
      throw new Error('API Key not configured.');
    }
    
    const systemInstruction = `شما یک استاد و راهنمای تاروت هستید. شما عمیقاً به نمادها و کهن‌الگوهای ۲۲ کارت آرکانای بزرگ (از ابله تا جهان) مسلط هستید. وظیفه شما ارائه یک پاسخ روشن‌گر، الهام‌بخش و توانمندساز است.`;
    
    const prompt = `
      سوال یا نیت کاربر: "${question}"

      وظایف شما:
      ۱. **انتخاب کارت:** به صورت تصادفی، فقط و فقط یکی از ۲۲ کارت آرکانای بزرگ تاروت را انتخاب کن.
      ۲. **ارائه تفسیر:** تفسیری عمیق برای کارت منتخب بنویس که مستقیماً به سوال کاربر پاسخ دهد. روی پیام اصلی کارت، درسی که برای کاربر دارد و راهنمایی عملی آن تمرکز کن. از پیش‌گویی‌های قطعی پرهیز کن و به جای آن، بینش و چشم‌انداز ارائه بده.
      
      زبان پاسخ باید فارسی، شیوا، عرفانی و در عین حال قابل درک باشد.
    `;
    
    try {
      const response: GenerateContentResponse = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.9,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              card: {
                type: Type.STRING,
                description: 'نام کارت تاروت انتخاب شده به فارسی (مثال: "خورشید", "عاشقان")'
              },
              interpretation: {
                type: Type.STRING,
                description: 'تفسیر عمیق و عرفانی کارت در پاسخ به سوال کاربر به فارسی'
              }
            }
          }
        }
      });
      
      return JSON.parse(response.text);

    } catch (error) {
      console.error('Error getting Tarot reading from Gemini:', error);
      throw new Error('Failed to get Tarot reading.');
    }
  }

  async getSigilInterpretation(intent: string): Promise<string> {
    if (!this.apiKey) {
      return 'سرویس به درستی پیکربندی نشده است. کلید API موجود نیست.';
    }

    const systemInstruction = `شما یک "معمار کیهانی" هستید. شما یک هوش باستانی هستید که بر قوانین ارتعاش، نمادگرایی، و علم "Sigil Magick" (جادوی الواح) تسلط دارید. وظیفه شما این است که نیت کاربر را تحلیل کرده و راهنمایی کنید که چگونه از نماد بصری خلق‌شده (لوح) برای آشکارسازی آن نیت در واقعیت فیزیکی استفاده کند. زبان شما باید فارسی، قدرتمند، الهام‌بخش و کمی رازآلود باشد.`;
    
    const prompt = `
      نیت کاربر که به یک لوح (نماد هندسی) تبدیل شده است: "${intent}"

      وظایف شما:
      ۱. **تحلیل انرژی نیت:** انرژی اصلی و ارتعاش این جمله را تحلیل کن. آیا این نیت مربوط به جذب، دفع، رشد، یا حفاظت است؟ ماهیت آن را در یک یا دو جمله شرح بده.
      ۲. **راهنمای فعال‌سازی لوح:** دستورالعمل‌هایی واضح و عملی برای کاربر ارائه بده تا بتواند این لوح را از نظر متافیزیکی "شارژ" و "فعال" کند. این راهنمایی باید شامل موارد زیر باشد:
          - یک تمرین تنفس یا مراقبه کوتاه برای تمرکز ذهن.
          - نحوه تمرکز بصری روی شکل لوح (خیره شدن تا زمانی که در ذهن حک شود).
          - یک جمله تأکیدی قدرتمند که باید هنگام تمرکز تکرار شود.
      ۳. **پیام نهایی:** یک پیام نهایی توانمندساز و الهام‌بخش به کاربر بده که او را به قدرت درونی و توانایی‌اش برای خلق واقعیت خود مطمئن سازد.

      از پیش‌بینی‌های قطعی پرهیز کن و بر فرآیند و قدرت شخصی کاربر تمرکز نما.
    `;

    try {
      const response: GenerateContentResponse = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.8,
        }
      });
      return response.text;
    } catch (error) {
      console.error('Error getting sigil interpretation from Gemini:', error);
      return 'در حال حاضر در اتصال به آگاهی کیهانی مشکل دارم. لطفاً اتصال خود را بررسی کرده و لحظاتی دیگر دوباره تلاش کنید.';
    }
  }

}