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
  template: `<!-- The fixed, non-scrolling background elements -->
<canvas #matrixCanvas id="matrixCanvas"></canvas>
<div class="wormhole-container" [class.active]="!!calculationResult()">
  <div class="wormhole-nebula"></div>
  <div class="ring ring-1"></div>
  <div class="ring ring-2"></div>
  <div class="ring ring-3"></div>
  <div class="ring ring-4"></div>
  <div class="wormhole-center"></div>
</div>

<!-- The main content that scrolls over the background -->
<main class="content-wrapper font-sans antialiased text-gray-200">
  <header class="w-full p-4 flex justify-center items-center sticky top-0 z-20 shrink-0 border-b border-gray-700/50 bg-gray-900/50 backdrop-blur-sm h-20 relative">
    <!-- Centered Title -->
    <div class="flex items-center gap-3">
      <svg class="w-8 h-8 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
      </svg>
      <h1 class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">پنل اسطوره</h1>
    </div>

    <!-- Temporal Relay -->
    <div class="absolute top-1/2 right-4 transform -translate-y-1/2">
      <div class="relative">
        <button (click)="toggleRelay()" class="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-700/50 transition-colors" title="تنظیم زمان">
          <svg class="w-5 h-5 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-sm font-mono text-gray-300">{{ adjustedDate() | date:'HH:mm:ss' }}</span>
        </button>

        @if (isRelayOpen()) {
          <div class="absolute top-full right-0 mt-2 w-64 p-4 bg-gray-800/80 backdrop-blur-md rounded-xl shadow-lg border border-gray-700/50 z-30">
            <div class="text-center mb-4">
              <p class="font-mono text-xl text-cyan-400">{{ adjustedDate() | date:'HH:mm:ss' }}</p>
              <p class="font-mono text-sm text-gray-400">{{ adjustedDate() | date:'yyyy-MM-dd' }}</p>
            </div>
            <div class="grid grid-cols-3 gap-x-2 gap-y-3 text-center items-center text-sm font-mono">
              @for (unit of ['سال', 'ماه', 'روز', 'ساعت', 'دقیقه']; track unit) {
                <button (mousedown)="startAdjusting(unit, -1)" (mouseup)="stopAdjusting()" (mouseleave)="stopAdjusting()" class="py-1 rounded bg-gray-700 hover:bg-fuchsia-600 transition-colors">-</button>
                <span class="text-gray-400">{{ unit }}</span>
                <button (mousedown)="startAdjusting(unit, 1)" (mouseup)="stopAdjusting()" (mouseleave)="stopAdjusting()" class="py-1 rounded bg-gray-700 hover:bg-cyan-600 transition-colors">+</button>
              }
            </div>
            <button (click)="resetToPresent()" class="w-full mt-4 py-2 text-sm rounded bg-gray-700 hover:bg-gray-600 transition-colors">بازگشت به حال</button>
          </div>
        }
      </div>
    </div>
  </header>

  <div class="min-h-screen p-4 md:p-8 flex flex-col items-center">
    <div class="w-full max-w-2xl">
      
      <!-- Tab Navigation -->
      <nav class="tab-nav">
        <button (click)="selectTab('abjad')" [class.active]="activeTab() === 'abjad'">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg>
          <span>تحلیل ابجد</span>
        </button>
        <button (click)="selectTab('astrology')" [class.active]="activeTab() === 'astrology'">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
          <span>مسیر زندگی</span>
        </button>
        <button (click)="selectTab('mostahsaleh')" [class.active]="activeTab() === 'mostahsaleh'">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.362-3.797A8.222 8.222 0 0012 6a8.222 8.222 0 00-3 1.048 8.287 8.287 0 00-1.29 2.048A8.251 8.251 0 0112 3c1.226 0 2.378.29 3.362.805z" /></svg>
          <span>جوهر درون</span>
        </button>
        <button (click)="selectTab('tarot')" [class.active]="activeTab() === 'tarot'">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>
          <span>فال تاروت</span>
        </button>
        <button (click)="selectTab('sigil')" [class.active]="activeTab() === 'sigil'">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" /></svg>
          <span>مولد الواح</span>
        </button>
      </nav>

      <!-- Tab Content -->
      <div class="tab-content">
        @switch (activeTab()) {
          @case ('abjad') {
            <div class="tab-pane">
              <!-- Numerology Calculator -->
              <div class="p-6 bg-gray-800/50 rounded-2xl shadow-2xl border border-gray-700/50 backdrop-blur-sm">
                <label for="text-input" class="block mb-2 text-lg font-medium text-gray-300">کلمه یا عبارت را وارد کنید:</label>
                <textarea 
                  id="text-input"
                  rows="3"
                  [ngModel]="userInput()"
                  (ngModelChange)="userInput.set($event)"
                  name="userInput"
                  placeholder="مثال: بسم الله الرحمن الرحیم"
                  class="w-full p-3 bg-gray-900/70 border-2 border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors text-lg text-gray-200 placeholder-gray-500 resize-none"
                ></textarea>
                <button 
                  (click)="calculate()"
                  [disabled]="isLoading() || userInput().trim() === ''"
                  class="mt-4 w-full py-3 text-lg font-semibold text-white rounded-lg bg-gradient-to-r from-fuchsia-600 to-blue-600 hover:from-fuchsia-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fuchsia-500 focus:ring-offset-gray-900"
                >
                  @if (isLoading()) {
                    <div class="flex items-center justify-center">
                      <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>در حال محاسبه...</span>
                    </div>
                  } @else {
                    <span>محاسبه کن</span>
                  }
                </button>
              </div>

              @if (calculationResult(); as result) {
                <div class="mt-8 p-6 bg-gray-800/50 rounded-2xl shadow-2xl border border-gray-700/50 backdrop-blur-sm">
                  <div class="text-center mb-6">
                    <h2 class="text-lg font-medium text-cyan-400">مقدار عددی کل (ابجد)</h2>
                    <p class="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400 my-2">{{ result.total }}</p>
                  </div>
                  <div class="mb-6">
                    <h3 class="text-lg font-medium text-cyan-400 mb-3 text-center">تجزیه حروف</h3>
                    <div class="flex flex-wrap justify-center gap-2">
                      @for (item of result.breakdown; track $index) {
                        <div class="flex flex-col items-center p-2 rounded-lg bg-gray-900/60 border border-gray-700 min-w-[40px]">
                          <span class="text-xl font-semibold text-gray-200">{{ item.char }}</span>
                          <span class="text-sm text-cyan-400">{{ item.value }}</span>
                        </div>
                      }
                    </div>
                  </div>
                  <div>
                    <h3 class="text-lg font-medium text-cyan-400 mb-3 text-center">تفسیر عدد</h3>
                    <div class="p-4 rounded-lg bg-gray-900/60 border border-gray-700 text-gray-300 text-center leading-relaxed">
                      <p>{{ result.interpretation }}</p>
                    </div>
                  </div>
                  <div class="mt-6 flex justify-center">
                    <button (click)="exportReading('abjad')" class="export-button">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      ذخیره تحلیل
                    </button>
                  </div>
                </div>
              }

              <!-- History Panel -->
              <div class="mt-8 p-6 bg-gray-800/50 rounded-2xl shadow-2xl border border-gray-700/50 backdrop-blur-sm">
                <div class="flex justify-between items-center mb-4">
                  <h2 class="text-xl font-semibold text-gray-300">تاریخچه محاسبات</h2>
                  @if (history().length > 0) {
                    <button (click)="clearHistory()" class="p-2 rounded-full hover:bg-gray-700/50 transition-colors" aria-label="پاک کردن تاریخچه">
                      <svg class="w-5 h-5 text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.124-2.033-2.124H8.033c-1.12 0-2.033.944-2.033 2.124v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  }
                </div>
                @if (history().length > 0) {
                  <ul class="space-y-2">
                    @for(item of history(); track $index) {
                      <li (click)="selectHistoryItem(item)" class="flex justify-between items-center p-3 rounded-lg bg-gray-900/60 hover:bg-gray-700/50 cursor-pointer transition-colors">
                        <span class="font-medium text-gray-300 truncate" title="{{ item.text }}">{{ item.text }}</span>
                        <span class="text-lg font-bold text-cyan-400">{{ item.total }}</span>
                      </li>
                    }
                  </ul>
                } @else {
                  <p class="text-center text-gray-500">هنوز محاسباتی انجام نشده است.</p>
                }
              </div>
            </div>
          }
          @case ('astrology') {
            <div class="tab-pane">
              <!-- Astrology Panel -->
              <div class="p-6 bg-gray-800/50 rounded-2xl shadow-2xl border border-gray-700/50 backdrop-blur-sm">
                <h2 class="text-xl font-semibold text-gray-300 mb-4 text-center">تحلیل مسیر زندگی و استعدادهای نهان</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div class="grid grid-cols-3 gap-2">
                    <div>
                      <label for="birth-day" class="block text-sm font-medium text-gray-400 mb-1">روز</label>
                      <select id="birth-day" [ngModel]="birthDay()" (ngModelChange)="birthDay.set($event)" class="form-select">
                        <option [ngValue]="null" disabled>انتخاب</option>
                        @for(day of days; track day) { <option [value]="day">{{day}}</option> }
                      </select>
                    </div>
                    <div>
                      <label for="birth-month" class="block text-sm font-medium text-gray-400 mb-1">ماه</label>
                      <select id="birth-month" [ngModel]="birthMonth()" (ngModelChange)="birthMonth.set($event)" class="form-select">
                        <option [ngValue]="null" disabled>انتخاب</option>
                        @for(month of months; track month.value) { <option [value]="month.value">{{month.name}}</option> }
                      </select>
                    </div>
                    <div>
                      <label for="birth-year" class="block text-sm font-medium text-gray-400 mb-1">سال</label>
                      <input id="birth-year" type="number" [ngModel]="birthYear()" (ngModelChange)="birthYear.set($event)" placeholder="مثال: ۱۳۷۰" class="form-input">
                    </div>
                  </div>
                  <div>
                    <label for="gender" class="block text-sm font-medium text-gray-400 mb-1">جنسیت</label>
                    <select id="gender" [ngModel]="gender()" (ngModelChange)="gender.set($event)" class="form-select">
                      <option [ngValue]="null" disabled>انتخاب</option>
                      <option value="زن">زن</option>
                      <option value="مرد">مرد</option>
                    </select>
                  </div>
                </div>
                <button (click)="generateAstrologicalReading()" [disabled]="isAstrologyLoading() || !birthDay() || !birthMonth() || !birthYear() || !gender()" class="w-full py-3 text-lg font-semibold text-white rounded-lg bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-gray-900">
                  @if (isAstrologyLoading()) {
                    <div class="flex items-center justify-center">
                      <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      <span>در حال تحلیل کائنات...</span>
                    </div>
                  } @else {
                    <span>دریافت تحلیل سرنوشت</span>
                  }
                </button>
                @if(astrologicalReading()) {
                  <div class="mt-6 p-4 rounded-lg bg-gray-900/60 border border-gray-700/50">
                    <h3 class="text-lg font-medium text-cyan-400 mb-3 text-center">پیام کائنات برای شما:</h3>
                    <p class="text-gray-300 text-center leading-relaxed whitespace-pre-wrap">{{ astrologicalReading() }}</p>
                    <div class="mt-6 flex justify-center">
                      <button (click)="exportReading('astrology')" class="export-button">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        ذخیره تحلیل
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
          @case ('mostahsaleh') {
            <div class="tab-pane">
              <!-- Mostahsaleh Panel -->
              <div class="p-6 rounded-2xl shadow-2xl mostahsaleh-panel backdrop-blur-sm">
                <h2 class="text-xl font-semibold text-yellow-300 mb-4 text-center">تحلیل مستحصله و استخراج جوهر درون</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label for="user-name" class="block text-sm font-medium text-gray-400 mb-1">نام کامل شما</label>
                    <input id="user-name" type="text" [ngModel]="userName()" (ngModelChange)="userName.set($event)" placeholder="مثال: علی رضایی" class="form-input">
                  </div>
                  <div>
                    <label for="mother-name" class="block text-sm font-medium text-gray-400 mb-1">نام مادر</label>
                    <input id="mother-name" type="text" [ngModel]="motherName()" (ngModelChange)="motherName.set($event)" placeholder="مثال: فاطمه" class="form-input">
                  </div>
                </div>
                <button (click)="generateMostahsalehAnalysis()" [disabled]="isMostahsalehLoading() || userName().trim() === '' || motherName().trim() === ''" class="w-full py-3 text-lg font-semibold text-gray-900 rounded-lg bg-gradient-to-r from-yellow-300 to-amber-500 hover:from-yellow-400 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 focus:ring-offset-gray-900">
                  @if (isMostahsalehLoading()) {
                    <div class="flex items-center justify-center">
                      <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      <span>در حال مکاشفه...</span>
                    </div>
                  } @else {
                    <span>استخراج جوهر</span>
                  }
                </button>
                @if(mostahsalehResult(); as result) {
                  <div class="mt-6 p-4 rounded-lg bg-gray-900/60 border border-amber-400/50 text-center">
                    <h3 class="text-lg font-medium text-gray-400 mb-2">مقدار ابجد کل: <span class="font-bold text-amber-300">{{ result.totalValue }}</span></h3>
                    <h2 class="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-500 my-4" style="text-shadow: 0 0 15px rgba(252, 211, 77, 0.5);">{{ result.essenceWord }}</h2>
                    <h3 class="text-lg font-medium text-amber-300 mb-3">تفسیر کلمه جوهر:</h3>
                    <p class="text-gray-300 leading-relaxed whitespace-pre-wrap">{{ result.interpretation }}</p>
                    <div class="mt-6 flex justify-center">
                      <button (click)="exportReading('mostahsaleh')" class="export-button-gold">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        ذخیره تحلیل
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
          @case ('tarot') {
            <div class="tab-pane">
              <!-- Tarot Panel -->
              <div class="p-6 rounded-2xl shadow-2xl tarot-panel backdrop-blur-sm">
                <h2 class="text-xl font-semibold text-purple-300 mb-4 text-center">راهنمایی از اوراکل تاروت</h2>
                <label for="tarot-question" class="block mb-2 text-lg font-medium text-gray-300">سوال یا نیت خود را بنویسید:</label>
                <textarea 
                  id="tarot-question"
                  rows="3"
                  [ngModel]="tarotQuestion()"
                  (ngModelChange)="tarotQuestion.set($event)"
                  placeholder="مثال: چه چیزی را باید در مورد مسیر شغلی‌ام بدانم؟"
                  class="w-full p-3 bg-gray-900/70 border-2 border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-lg text-gray-200 placeholder-gray-500 resize-none"
                ></textarea>
                <button 
                  (click)="drawTarotCard()"
                  [disabled]="isTarotLoading() || tarotQuestion().trim() === ''"
                  class="mt-4 w-full py-3 text-lg font-semibold text-white rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-gray-900"
                >
                  @if (isTarotLoading()) {
                    <div class="flex items-center justify-center">
                      <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>ارتباط با ماورا...</span>
                    </div>
                  } @else {
                    <span>یک کارت بکش</span>
                  }
                </button>
                @if(tarotReading(); as reading) {
                  <div class="mt-6 p-4 rounded-lg bg-gray-900/60 border border-purple-400/50 text-center">
                    <h3 class="text-lg font-medium text-gray-400 mb-2">کارت شما:</h3>
                    <h2 class="tarot-card-name">{{ reading.card }}</h2>
                    <h3 class="text-lg font-medium text-purple-300 mb-3 mt-4">تفسیر کارت:</h3>
                    <p class="text-gray-300 leading-relaxed whitespace-pre-wrap">{{ reading.interpretation }}</p>
                    <div class="mt-6 flex justify-center">
                      <button (click)="exportReading('tarot')" class="export-button-purple">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        ذخیره فال
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
          @case ('sigil') {
            <div class="tab-pane">
              <!-- Sigil Generator Panel -->
              <div class="p-6 rounded-2xl shadow-2xl sigil-panel backdrop-blur-sm">
                <h2 class="text-xl font-semibold text-cyan-300 mb-4 text-center">مولد الواح کیهانی</h2>
                <label for="sigil-intent" class="block mb-2 text-lg font-medium text-gray-300">نیت خود را به وضوح بیان کنید:</label>
                <textarea 
                  id="sigil-intent"
                  rows="3"
                  [ngModel]="sigilIntent()"
                  (ngModelChange)="sigilIntent.set($event)"
                  placeholder="مثال: من خلاقیت بی‌پایان را به زندگی خود جذب می‌کنم."
                  class="w-full p-3 bg-gray-900/70 border-2 border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors text-lg text-gray-200 placeholder-gray-500 resize-none"
                ></textarea>
                <button 
                  (click)="generateSigil()"
                  [disabled]="isSigilLoading() || sigilIntent().trim() === ''"
                  class="mt-4 w-full py-3 text-lg font-semibold text-gray-900 rounded-lg bg-gradient-to-r from-cyan-300 to-sky-500 hover:from-cyan-400 hover:to-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-400 focus:ring-offset-gray-900"
                >
                  @if (isSigilLoading()) {
                    <div class="flex items-center justify-center">
                      <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      <span>در حال خلق...</span>
                    </div>
                  } @else {
                    <span>خلق لوح</span>
                  }
                </button>

                @if(sigilInterpretation()) {
                  <div class="mt-6 p-4 rounded-lg bg-gray-900/60 border border-cyan-400/50 text-center">
                    <h3 class="text-lg font-medium text-gray-400 mb-2">لوح کیهانی نیت شما:</h3>
                    <div class="flex justify-center my-4">
                       <canvas #sigilCanvas class="sigil-canvas" width="250" height="250"></canvas>
                    </div>
                    <h3 class="text-lg font-medium text-cyan-300 mb-3 mt-4">تفسیر معمار کیهانی:</h3>
                    <p class="text-gray-300 leading-relaxed whitespace-pre-wrap">{{ sigilInterpretation() }}</p>
                    <div class="mt-6 flex justify-center">
                      <button (click)="exportReading('sigil')" class="export-button-cyan">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        ذخیره لوح
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        }
      </div>
      <footer class="text-center p-4 text-xs text-gray-500 mt-auto">
        <a (click)="isDisclaimerVisible.set(true)" class="cursor-pointer hover:text-gray-400 transition-colors">سلب مسئولیت و درباره ما</a>
        <span class="mx-2">|</span>
        <span>ساخته شده توسط یاسین کیانی فر</span>
      </footer>
    </div>

    <!-- Abjad Table Toggle Button -->
    <button (click)="toggleTable()" class="table-toggle-btn" title="نمایش جدول ابجد">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7l8 4" /></svg>
    </button>

    <!-- Abjad Table Modal -->
    @if (isTableVisible()) {
      <div class="modal-backdrop" (click)="toggleTable()"></div>
      <div class="modal-panel">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold text-cyan-400">جدول راهنمای ابجد</h3>
          <button (click)="toggleTable()" class="p-2 rounded-full hover:bg-gray-700/50 transition-colors">
            <svg class="w-6 h-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          @for(item of abjadDisplayList; track item.value) {
            <div class="p-3 bg-gray-900/70 rounded-lg border border-gray-700/50">
              <div class="text-2xl font-bold text-cyan-400 tracking-wider">{{ item.value }}</div>
              <div class="text-lg text-gray-300 mt-1">{{ item.letters.join(', ') }}</div>
            </div>
          }
        </div>
      </div>
    }

    <!-- Welcome Modal -->
    @if (showWelcomeModal()) {
      <div class="modal-backdrop"></div>
      <div class="modal-panel">
        <h3 class="text-xl font-bold text-cyan-400 mb-4 text-center">به پنل اسطوره خوش آمدید</h3>
        <p class="text-gray-300 mb-4 leading-relaxed text-center">این ابزار برای مکاشفه، خودشناسی و درک نیروهای درونی شما طراحی شده است. تحلیل‌های ارائه شده بر اساس علوم کهن، راهنمایی برای روشن کردن مسیر زندگی شماست.</p>
        <p class="text-amber-300 font-semibold text-center mb-6">هدف، توانمندسازی شماست، نه پیش‌گویی قطعی.</p>
        <button (click)="closeWelcomeModal()" class="w-full py-2 text-lg font-semibold text-white rounded-lg bg-gradient-to-r from-fuchsia-600 to-blue-600 hover:from-fuchsia-700 hover:to-blue-700">ادامه می‌دهم</button>
      </div>
    }

    <!-- Disclaimer Modal -->
    @if (isDisclaimerVisible()) {
      <div class="modal-backdrop" (click)="isDisclaimerVisible.set(false)"></div>
      <div class="modal-panel">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold text-cyan-400">سلب مسئولیت و درباره ما</h3>
          <button (click)="isDisclaimerVisible.set(false)" class="p-2 rounded-full hover:bg-gray-700/50 transition-colors">
              <svg class="w-6 h-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <p class="text-gray-300 mb-4 leading-relaxed">این برنامه با هدف ارائه بینش و کمک به خودشناسی از طریق علوم باستانی طراحی شده است. تحلیل‌های ارائه شده جنبه سرگرمی و راهنمایی معنوی دارند و نباید به عنوان مشاوره تخصصی (مالی، پزشکی، حقوقی و غیره) یا پیش‌بینی قطعی آینده تلقی شوند.</p>
        <p class="text-gray-300 leading-relaxed">مسئولیت تمام تصمیمات زندگی بر عهده خود کاربر است. با استفاده از این برنامه، شما می‌پذیرید که سازندگان آن هیچ مسئولیتی در قبال انتخاب‌ها و اقدامات شما ندارند.</p>
      </div>
    }
</main>`,
  styles: [`
    /* Using ":host" to ensure styles are scoped to this component */
    :host {
      display: block;
      height: 100vh;
      overflow-y: auto; /* Allow the host to be the main scroller */
    }

    /* --- Entry Gate Styles --- */
    .entry-gate {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #111827; /* bg-gray-900 */
      animation: gate-fade-in 1.5s cubic-bezier(0.25, 1, 0.5, 1);
      transition: opacity 2s ease-in-out, backdrop-filter 2s ease-in-out;
    }
    .entry-gate.is-entering {
      opacity: 0;
      backdrop-filter: blur(20px) brightness(3);
      pointer-events: none;
    }
    .gate-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 1rem;
      transition: opacity 0.5s ease-out;
    }
    .entry-gate.is-entering .gate-content {
      opacity: 0;
    }
    .glowing-eye {
      width: 7rem; /* w-28 */
      height: 7rem; /* h-28 */
      color: #22d3ee; /* text-cyan-400 */
      animation: eye-glow 5s ease-in-out infinite;
      transition: transform 2s ease-in-out;
    }
    .entry-gate.is-entering .glowing-eye {
      transform: scale(10);
    }
    .gate-form {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    @keyframes gate-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes eye-glow {
      0%, 100% { filter: drop-shadow(0 0 8px rgba(34, 211, 238, 0.6)); }
      50% { filter: drop-shadow(0 0 25px rgba(34, 211, 238, 1)); }
    }

    /* Matrix background canvas */
    canvas#matrixCanvas {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
    }

    /* Wormhole container */
    .wormhole-container {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1;
      pointer-events: none; /* Allows clicking through it */
    }

    /* The central white hole */
    .wormhole-center {
      width: 50px;
      height: 50px;
      background-color: white;
      border-radius: 50%;
      box-shadow: 0 0 20px 10px white, 0 0 50px 20px rgba(255, 255, 255, 0.5);
      filter: blur(5px);
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(1);
      transition: transform 1s ease-out, box-shadow 1s ease-out;
    }

    /* Nebula/smoke effect */
    .wormhole-nebula {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 200px;
        height: 200px;
        margin-top: -100px;
        margin-left: -100px;
        background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(200,200,220,0.05) 40%, transparent 70%);
        border-radius: 50%;
        opacity: 0;
        transform: scale(0.5);
        transition: transform 1.5s cubic-bezier(0.25, 1, 0.5, 1), opacity 1.5s ease-out;
        filter: blur(10px);
    }

    /* Shared styles for all rings */
    .ring {
      position: absolute;
      top: 50%;
      left: 50%;
      border-radius: 50%;
      border-style: solid;
      border-width: 2px;
      transform-origin: center;
      transition: animation-duration 1s ease-out;
    }

    /* --- ACTIVE STATE STYLES --- */

    .wormhole-container.active .wormhole-center {
      transform: translate(-50%, -50%) scale(1.8);
      box-shadow: 0 0 30px 15px white, 0 0 70px 30px #a855f7, 0 0 100px 50px #22d3ee;
    }

    .wormhole-container.active .wormhole-nebula {
      opacity: 1;
      transform: scale(2.5);
    }

    .wormhole-container.active .ring-1 { animation-duration: 3s; }
    .wormhole-container.active .ring-2 { animation-duration: 5s; }
    .wormhole-container.active .ring-3 { animation-duration: 8s; }
    .wormhole-container.active .ring-4 { animation-duration: 10s; }


    /* Individual ring styles and animations */
    .ring-1 {
      width: 100px;
      height: 100px;
      margin-top: -50px;
      margin-left: -50px;
      border-color: #22d3ee; /* cyan-400 */
      animation: rotate-clockwise 10s linear infinite;
      opacity: 0.8;
    }

    .ring-2 {
      width: 170px;
      height: 170px;
      margin-top: -85px;
      margin-left: -85px;
      border-color: #a855f7; /* fuchsia-500 */
      animation: rotate-counter-clockwise 15s linear infinite;
      opacity: 0.7;
    }

    .ring-3 {
      width: 240px;
      height: 240px;
      margin-top: -120px;
      margin-left: -120px;
      border-color: #67e8f9; /* cyan-300 */
      border-style: dashed;
      animation: rotate-clockwise 25s linear infinite;
      opacity: 0.6;
    }

    .ring-4 {
        width: 310px;
        height: 310px;
        margin-top: -155px;
        margin-left: -155px;
        border-color: #c084fc; /* fuchsia-400 */
        animation: rotate-counter-clockwise 30s linear infinite;
        opacity: 0.5;
    }


    /* Keyframe animations for rotation */
    @keyframes rotate-clockwise {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @keyframes rotate-counter-clockwise {
      from { transform: rotate(0deg); }
      to { transform: rotate(-360deg); }
    }

    /* Main content container that sits on top of the background */
    .content-wrapper {
      position: relative;
      z-index: 2;
      width: 100%;
      animation: content-fade-in 1.5s ease-out;
    }

    /* --- Abjad Table Styles --- */
    .table-toggle-btn {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 30;
      width: 4rem;
      height: 4rem;
      border-radius: 50%;
      background-image: linear-gradient(to right, #a855f7, #22d3ee);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
      transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
    }
    .table-toggle-btn:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 20px rgba(168, 85, 247, 0.5);
    }

    /* --- Modal Styles --- */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.6);
      z-index: 40;
      animation: backdrop-fade-in 0.3s ease-out;
    }
    .modal-panel {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 50;
      width: 90%;
      max-width: 500px;
      padding: 1.5rem;
      background: linear-gradient(45deg, rgba(34, 211, 238, 0.1), rgba(168, 85, 247, 0.1));
      backdrop-filter: blur(15px);
      border-radius: 1rem;
      border: 1px solid rgba(34, 211, 238, 0.4);
      box-shadow: 0 0 15px rgba(34, 211, 238, 0.5), 0 0 30px rgba(168, 85, 247, 0.4), inset 0 0 10px rgba(34, 211, 238, 0.2);
      animation: modal-fade-in 0.3s cubic-bezier(0.25, 1, 0.5, 1);
      overflow: hidden;
    }
    .modal-panel::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(34, 211, 238, 0.1) 2px, rgba(34, 211, 238, 0.1) 4px);
      pointer-events: none;
      animation: scanlines 20s linear infinite;
    }
    .modal-panel h3, .modal-panel .text-2xl, .modal-panel .text-lg {
      text-shadow: 0 0 5px rgba(34, 211, 238, 0.8), 0 0 10px rgba(168, 85, 247, 0.4);
    }
    @keyframes backdrop-fade-in { from { opacity: 0; } to { opacity: 1; } }
    @keyframes modal-fade-in { from { opacity: 0; transform: translate(-50%, -45%); } to { opacity: 1; transform: translate(-50%, -50%); } }
    @keyframes scanlines { from { background-position: 0 0; } to { background-position: 0 200px; } }

    /* --- Form Styles --- */
    .form-select, .form-input {
      width: 100%;
      height: 100%;
      padding: 0.75rem;
      background-color: rgba(17, 24, 39, 0.7); /* bg-gray-900/70 */
      border: 1px solid #4b5563; /* border-gray-600 */
      border-radius: 0.5rem; /* rounded-lg */
      color: #d1d5db; /* text-gray-300 */
      transition: border-color 0.2s, box-shadow 0.2s;
      font-size: 1rem;
    }
    .form-select:focus, .form-input:focus {
      outline: none;
      border-color: #06b6d4; /* border-cyan-500 */
      box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.5); /* ring-2 ring-cyan-500 */
    }
    .form-select {
      -webkit-appearance: none;
      -moz-appearance: none;
      appearance: none;
      background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
      background-position: right 0.5rem center;
      background-repeat: no-repeat;
      background-size: 1.5em 1.5em;
      padding-right: 2.5rem;
    }
    .form-select:-moz-focusring { color: transparent; text-shadow: 0 0 0 #d1d5db; }
    .form-input::placeholder { color: #6b7280; /* placeholder-gray-500 */ }

    /* --- Mostahsaleh Panel --- */
    .mostahsaleh-panel {
      background-color: rgba(31, 25, 9, 0.3); /* dark gold/brownish transparent */
      border: 1px solid rgba(252, 211, 77, 0.3); /* border-amber-400/30 */
      box-shadow: 0 0 25px rgba(252, 211, 77, 0.1), inset 0 0 10px rgba(250, 204, 21, 0.1); /* shadow-amber, inset-yellow */
    }
    .mostahsaleh-panel .form-input:focus {
      border-color: #f59e0b; /* border-amber-500 */
      box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.5); /* ring-2 ring-amber-500 */
    }

    /* --- Tarot Panel --- */
    .tarot-panel {
      background-color: rgba(26, 19, 44, 0.3);
      border: 1px solid rgba(167, 139, 250, 0.3); /* border-purple-400/30 */
      box-shadow: 0 0 25px rgba(139, 92, 246, 0.1), inset 0 0 10px rgba(124, 58, 237, 0.1); /* shadow-purple, inset-indigo */
    }
    .tarot-panel textarea:focus {
      border-color: #8b5cf6; /* border-purple-500 */
      box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.5); /* ring-2 ring-purple-500 */
    }
    .tarot-card-name {
      font-size: 2.25rem; /* text-4xl */
      font-weight: bold;
      background-image: linear-gradient(to right, #a78bfa, #c4b5fd); /* from-purple-400 to-purple-300 */
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      padding: 0.5rem 0;
      text-shadow: 0 0 15px rgba(167, 139, 250, 0.5);
    }

    /* --- Sigil Panel --- */
    .sigil-panel {
      background-color: rgba(14, 27, 49, 0.3);
      border: 1px solid rgba(34, 211, 238, 0.3); /* border-cyan-400/30 */
      box-shadow: 0 0 25px rgba(6, 182, 212, 0.1), inset 0 0 10px rgba(14, 116, 144, 0.1);
    }
    .sigil-panel textarea:focus {
      border-color: #22d3ee; /* border-cyan-400 */
      box-shadow: 0 0 0 2px rgba(34, 211, 238, 0.5); /* ring-2 ring-cyan-400 */
    }
    .sigil-canvas {
      background-color: rgba(17, 24, 39, 0.5); /* bg-gray-900/50 */
      border-radius: 0.75rem; /* rounded-xl */
      border: 1px solid rgba(6, 182, 212, 0.2);
    }


    /* --- Export Buttons --- */
    .export-button, .export-button-gold, .export-button-purple, .export-button-cyan {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem 1.5rem;
      border-radius: 0.5rem;
      font-weight: 600;
      transition: background-color 0.2s, color 0.2s, transform 0.1s;
      cursor: pointer;
      border: 1px solid;
    }
    .export-button:hover, .export-button-gold:hover, .export-button-purple:hover, .export-button-cyan:hover {
      transform: translateY(-2px);
    }
    .export-button {
      background-color: transparent;
      border-color: #22d3ee; /* cyan-400 */
      color: #22d3ee;
    }
    .export-button:hover {
      background-color: #22d3ee;
      color: #111827; /* gray-900 */
    }
    .export-button-gold {
      background-color: transparent;
      border-color: #f59e0b; /* amber-500 */
      color: #f59e0b;
    }
    .export-button-gold:hover {
      background-color: #f59e0b;
      color: #111827; /* gray-900 */
    }
    .export-button-purple {
      background-color: transparent;
      border-color: #a78bfa; /* purple-400 */
      color: #a78bfa;
    }
    .export-button-purple:hover {
      background-color: #a78bfa;
      color: #111827; /* gray-900 */
    }
    .export-button-cyan {
      background-color: transparent;
      border-color: #67e8f9; /* cyan-300 */
      color: #67e8f9;
    }
    .export-button-cyan:hover {
      background-color: #67e8f9;
      color: #111827; /* gray-900 */
    }


    /* --- Tab Navigation --- */
    .tab-nav {
      display: flex;
      justify-content: center;
      gap: 0.25rem; /* reduced gap */
      margin-bottom: 2rem;
      padding: 0.5rem;
      background-color: rgba(17, 24, 39, 0.5);
      border-radius: 1rem;
      border: 1px solid rgba(55, 65, 81, 0.5);
    }
    .tab-nav button {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 0.5rem; /* adjusted padding */
      border-radius: 0.75rem;
      border: none;
      background-color: transparent;
      color: #9ca3af; /* text-gray-400 */
      font-size: 0.9rem; /* slightly smaller font */
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease-in-out;
      white-space: nowrap; /* prevent text wrapping */
    }
    .tab-nav button:hover {
      background-color: rgba(55, 65, 81, 0.5);
      color: #d1d5db; /* text-gray-300 */
    }
    .tab-nav button.active {
      background-image: linear-gradient(to right, #a855f7, #22d3ee);
      color: white;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      transform: translateY(-2px);
    }
    .tab-nav button svg {
      width: 1.25rem; /* w-5 */
      height: 1.25rem; /* h-5 */
    }

    /* --- Tab Content --- */
    .tab-content {
      /* Container for the panes */
    }
    .tab-pane {
      animation: content-fade-in 0.5s cubic-bezier(0.25, 1, 0.5, 1);
      /* The margin-bottom on the panels inside the pane will create the spacing */
    }

    @keyframes content-fade-in {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DatePipe],
  // FIX: Replaced @HostListener with the host property for better practice.
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
  private timeUpdateInterval: any;
  private adjustmentInterval: any;
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
  private matrixAnimationInterval: any;

  private abjadMap: { [key: string]: number } = {
    'ا': 1, 'أ': 1, 'إ': 1, 'آ': 1, 'ب': 2, 'پ': 2, 'ج': 3, 'چ': 3, 'د': 4,
    'ه': 5, 'ة': 5, 'و': 6, 'ز': 7, 'ژ': 7, 'ح': 8, 'ط': 9, 'ی': 10, 'ي': 10,
    'ک': 20, 'ك': 20, 'گ': 20, 'ل': 30, 'م': 40, 'ن': 50, 'س': 60, 'ع': 70,
    'ف': 80, 'ص': 90, 'ق': 100, 'р': 200, 'ش': 300, 'ت': 400, 'ث': 500,
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