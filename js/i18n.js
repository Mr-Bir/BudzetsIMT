/*
 * Finanšu pārvaldnieks (BudzetsIMT) — i18n
 * Minimāla, atkarību-brīva tulkošanas sistēma (LV/EN). Valoda ir TIKAI
 * klienta puses/lokāla iestatīšana (localStorage, kā `theme`) — apzināti NAV
 * Firestore lauks, lai izvairītos no jauna top-level lauka riska rules pusē
 * (sk. BUDZETSIMT_MASTER_INSTRUKCIJA.md, sadaļa 10).
 */

const LANG_STORAGE_KEY = 'lang';
export const SUPPORTED_LANGS = ['lv', 'en'];
const DEFAULT_LANG = 'lv';

// Katra atslēga — vai nu vienkārša virkne, vai skaitļa-formu objekts
// (`{zero, one, other}` latviešu / `{one, other}` angļu valodai), izšķirts
// izpildlaikā ar Intl.PluralRules. Atslēgu nosaukumi: `sadaļa.apraksts`.
const STRINGS = {
  lv: {
    'app.name': 'Finanšu pārvaldnieks',

    'settings.title': 'Iestatījumi',
    'settings.subtitle': 'Lietotnes izskats un informācija',
    'settings.language': 'Valoda',
    'settings.language_hint': 'Saglabājas šajā ierīcē',
    'lang.lv': 'Latviešu',
    'lang.en': 'English',

    'gate.description': 'Piesakies ar savu Google kontu, lai piekļūtu savam budžetam. Tavi dati ir privāti un pieejami tikai tev.',
    'gate.signin_button': 'Pieteikties ar Google',

    'topbar.hamburger_aria': 'Atvērt izvēlni',
    'topbar.pace_info_aria': 'Par tēriņa tempa rādītājiem',
    'topbar.sync_status_title': 'Sinhronizācijas statuss',

    'popover.aria_label': 'Tēriņa tempa detaļas',
    'popover.spent_today': 'Iztērēts šodien',
    'popover.available_now': 'Pieejams tagad',
    'popover.safe_per_day': 'Droša summa / dienā',
    'popover.days_left_payday': 'Dienas līdz algai',
    'popover.days_left_month': 'Dienas līdz mēneša beigām',
    'popover.hint': '"Iztērēts šodien" ieskaita tikai šodien apmaksātos rēķinus un šodienas summējošo rēķinu epizodes. "Pieejams tagad" = alga mīnus viss reāli iztērētais (samaksātie rēķini + summējošo rēķinu epizodes) — atšķiras no "Paliek", kas rēķina arī vēl nesamaksātos rēķinus.',

    'drawer.nav_aria': 'Galvenā izvēlne',
    'drawer.close_aria': 'Aizvērt izvēlni',
    'drawer.sync_connecting': 'Savienojas…',
    'drawer.signout': 'Izrakstīties',

    'nav.budget': 'Budžets',
    'nav.extra_income': 'Papildus ienākumi',
    'nav.credits': 'Kredīti',
    'nav.reminders': 'Atgādinājumi',
    'nav.savings': 'Uzkrājuma mērķi',
    'nav.trends': 'Tendences',
    'nav.settings': 'Iestatījumi',
    'nav.install': '⭳ Instalēt lietotni',

    'reminder_banner.view': 'Skatīt',
    'reminder_banner.dismiss_title': 'Atzīmēt kā redzētu',

    'budget.summary_pin_title': 'Piespraust kopsavilkumu',
    'budget.summary_unpin_title': 'Atspraust kopsavilkumu',
    'budget.income_label': 'Ienākumi',
    'budget.total_bills_label': 'Kopā rēķini',
    'budget.remaining_label': 'Paliek',
    'budget.to_pay_label': 'Vēl jāmaksā',
    'budget.bills_title': 'Rēķini',
    'budget.period_label_title': 'Klikšķini, lai mainītu mēneša nosaukumu',
    'budget.sort_bills': 'Sakārtot',
    'budget.new_month': '🗓 Jauns mēnesis',
    'budget.add_bill': '+ Pievienot rēķinu',
    'budget.bills_foot_total_label': 'Kopā',
    'budget.category_breakdown_title': 'Sadalījums pa kategorijām',
    'budget.manage_categories': 'Pārvaldīt kategorijas',
    'budget.donut_total_label': 'kopā',
    'budget.archive_title': 'Mēnešu arhīvs',
    'budget.close_month': '✓ Saglabāt aktuālo mēnesi → arhīvā',
    'budget.export_json': '↓ Eksportēt (JSON)',
    'budget.export_csv': '↓ Eksportēt (CSV)',
    'budget.import': '↑ Importēt',

    'extra_income.title': 'Papildus ienākumi',
    'extra_income.add': '+ Pievienot ienākumu',
    'extra_income.total_label': 'Kopā papildus',
    'extra_income.empty': 'Vēl nav neviena papildus ienākuma šomēnes. Pievieno pirmo ar pogu augšā — piemēram, gadījuma darbu vai dāvanu. Tas pieskaitīsies kopējiem ienākumiem un pazudīs, sākot jaunu mēnesi (tāpat kā rēķini).',

    'credits.title': 'Kredītu atlikumi',
    'credits.add': '+ Kredīts',
    'credits.total_label': 'Atlikums kopā',
    'credits.monthly_label': 'Mēneša maksājumi kopā',

    'reminders.title': 'Atgādinājumi',
    'reminders.add': '+ Pievienot atgādinājumu',
    'reminders.group_due': 'Šodien / nokavēts',
    'reminders.group_upcoming': 'Gaidāmie',
    'reminders.group_paused': 'Pauzētie',
    'reminders.empty': 'Vēl nav neviena atgādinājuma. Pievieno pirmo ar pogu augšā.',

    'savings.title': 'Uzkrājuma mērķi',
    'savings.add': '+ Pievienot jaunu mērķi',
    'savings.group_achieved': 'Sasniegtie',
    'savings.empty': 'Vēl nav neviena uzkrājuma mērķa. Pievieno pirmo ar pogu augšā — izvēlies summu un mēnešu skaitu, un aplikācija pati sadalīs to ikmēneša maksājumos.',

    'trends.title': 'Atlikums pa mēnešiem',
    'trends.income_expense_title': 'Ienākumi vs izdevumi',
    'trends.category_title': 'Izdevumi pa kategorijām',
    'trends.empty': 'Vajag vismaz 2 arhivētus mēnešus, lai redzētu tendenci. Aizver mēnešus sadaļā "Budžets", lai sāktu vākt vēsturi.',

    'common.no_name': '(bez nosaukuma)',
    'common.deleted_bill': '(dzēsts rēķins)',
    'common.delete_title': 'Dzēst',
    'common.cancel': 'Atcelt',
    'common.save': 'Saglabāt',
    'common.close': 'Aizvērt',
    'common.add': 'Pievienot',
    'default_bill_name': 'Rēķins',
    'default_credit_name': 'Kredīts',

    'sync.synced': 'Sinhronizēts',
    'sync.saving': 'Saglabā…',
    'sync.error': 'Kļūda: {{code}}',
    'sync.save_failed': 'Saglabāšana neizdevās',

    'auth.google_not_confirmed': 'Google neapstiprināja pieteikšanos',
    'auth.signin_failed': 'Neizdevās pieteikties: {{msg}}',
    'auth.signin_error': 'Pieteikšanās kļūda: {{msg}}',
    'auth.signout_confirm': 'Izrakstīties? Nākamreiz atkal būs jāpiesakās ar Google.',
    'auth.signout_failed': 'Neizdevās izrakstīties: {{msg}}',

    'notif.reminder_title': 'Atgādinājums',

    'months.1': 'Janvāris', 'months.2': 'Februāris', 'months.3': 'Marts', 'months.4': 'Aprīlis',
    'months.5': 'Maijs', 'months.6': 'Jūnijs', 'months.7': 'Jūlijs', 'months.8': 'Augusts',
    'months.9': 'Septembris', 'months.10': 'Oktobris', 'months.11': 'Novembris', 'months.12': 'Decembris',

    'bills.name_placeholder': 'Nosaukums',
    'bills.delete_title': 'Dzēst',
    'bills.planned_limit_title': 'Plānotais limits',
    'bills.sum_from_entries_title': 'Kopsumma no epizodēm',
    'bills.add_entry_title': 'Pievienot epizodi',
    'bills.drag_title': 'Vilkt, lai pārkārtotu',
    'bills.move_aria': 'Pārvietot',
    'bills.summing_auto_title': 'Summējošs rēķins — katra epizode jau ir apmaksāta',
    'bills.mark_paid_title': 'Atzīmēt kā samaksātu',
    'bills.paid_aria': 'Samaksāts',
    'bills.delete_locked_title': 'Dzēš sadaļā "Uzkrājuma mērķi"',
    'bills.spent_prefix': 'Iztērēts',
    'bills.spent_of': 'no {{limit}}',
    'bills.no_limit_suffix': 'bez limita',
    'bills.overspent': 'pārtērēts {{amount}}',
    'bills.show_entries_title': 'Rādīt epizodes',
    'bills.collapse_entries_title': 'Sakļaut epizodes',
    'bills.change_limit': 'Mainīt limitu',
    'bills.set_limit': 'Uzlikt limitu',
    'bills.delete_entry_title': 'Dzēst epizodi',
    'bills.no_entries_yet': 'Vēl nav epizožu — pievieno ar "+"',
    'bills.cant_delete_goal_linked': 'Šo rēķinu nevar dzēst no Rēķinu saraksta — dzēs mērķi sadaļā "Uzkrājuma mērķi".',
    'bills.confirm_delete_named': 'Dzēst rēķinu "{{name}}"?',
    'bills.confirm_delete': 'Dzēst šo rēķinu?',
    'bills.confirm_delete_entry': 'Dzēst epizodi {{amount}}{{date}}?',
    'bills.new_bill_title': 'Jauns rēķins',
    'bills.new_bill_subtitle': 'Izvēlies rēķina veidu',
    'bills.normal_title': 'Parasts rēķins',
    'bills.normal_desc': 'Fiksēta summa mēnesī (piem. īre, komunālie)',
    'bills.summing_title': 'Summējošs rēķins',
    'bills.summing_desc': 'Krājas visu mēnesi, pievieno epizodes ar "+" (piem. degviela)',

    'entry_modal.title': 'Pievienot epizodi',
    'entry_modal.subtitle': '{{name}} — pašreiz {{amount}}',
    'entry_modal.amount_label': 'Summa €',
    'entry_modal.note_label': 'Piezīme (nav obligāta)',
    'entry_modal.note_placeholder': 'piem. degvielas uzpilde',
    'entry_modal.date_label': 'Datums',
    'entry_modal.amount_required': 'Ievadi summu, kas lielāka par 0.',

    'limit_modal.title': 'Mēneša limits',
    'limit_modal.subtitle': '{{name}} — plānotais maksimums mēnesī',
    'limit_modal.amount_label': 'Limits € (atstāj tukšu, lai noņemtu)',
    'limit_modal.hint': 'Ja uzliec limitu, "Kopā rēķini" izmantos šo summu (plānoto), nevis reāli iztērēto.',
    'limit_modal.invalid_amount': 'Ievadi derīgu summu.',

    'new_month.no_bills': 'Nav neviena rēķina, ko atiestatīt.',
    'new_month.title': 'Jauns mēnesis',
    'new_month.hint': 'Atzīmē rēķinus, kas atkārtojas katru mēnesi un jāpatur. Neatzīmētie tiks izdzēsti. Summējošiem rēķiniem tiks dzēstas epizodes (limits paliks nemainīgs), un visiem paturētajiem rēķiniem "Samaksāts" ķeksīši tiks noņemti.',
    'new_month.hint_archive': 'Ja saglabāsi arhīvā, tas tiks nosaukts "{{label}}".',
    'new_month.hint_rename': 'Pēc atiestatīšanas darba perioda nosaukums tiks automātiski mainīts uz "{{label}}" — vēlāk to vari pārrakstīt, klikšķinot uz nosaukuma pie "Rēķini".',
    'new_month.hint_goals': ' Uzkrājumu mērķu maksājumi tiek pārcelti automātiski — tie nav šajā sarakstā.',
    'new_month.archive_first': 'Vispirms saglabāt šo mēnesi arhīvā',
    'new_month.confirm_btn': 'Sākt jaunu mēnesi',
    'new_month.confirm_removal': 'Sākt jaunu mēnesi? {{count}} rēķins(-i) tiks izdzēsts(-i) neatgriezeniski.',
    'new_month.archive_failed': 'Neizdevās saglabāt arhīvā: {{msg}} — mēneša atiestatīšana pārtraukta, lai nezaudētu datus.',
    'new_month.done': 'Jauns mēnesis sagatavots ✓',

    'reminder_modal.title': 'Pievienot atgādinājumu',
    'reminder_modal.linked_tab': 'Piesaistīts rēķinam',
    'reminder_modal.free_tab': 'Brīvs atgādinājums',
    'reminder_modal.bill_label': 'Rēķins',
    'reminder_modal.day_label': 'Diena mēnesī (1–31)',
    'reminder_modal.day_hint': 'Atgādinājums automātiski atkārtojas katru mēnesi šajā dienā — arī pēc "Jauns mēnesis".',
    'reminder_modal.name_label': 'Nosaukums',
    'reminder_modal.name_placeholder': 'piem. Auto tehniskā apskate',
    'reminder_modal.date_label': 'Datums',
    'reminder_modal.invalid_day': 'Ievadi derīgu dienu (1–31).',
    'reminder_modal.name_required': 'Ievadi nosaukumu.',
    'reminder_modal.date_required': 'Izvēlies datumu.',
    'reminders.confirm_delete': 'Dzēst atgādinājumu "{{name}}"?',
    'reminders.paused_suffix': 'Pauzēts',
    'reminders.paused_bill_inactive': ' — rēķins vairs nav aktīvs',
    'reminders.paid_next': '✓ Samaksāts — nākamreiz {{date}}',
    'reminders.due_today': 'Šodien jāmaksā',
    'reminders.overdue': 'Nokavēts — bija {{date}}',
    'reminders.monthly_around': 'Katru mēnesi ap {{day}}. · nākamreiz {{date}}',
    'reminders.due_date': 'Termiņš: {{date}}',
    'reminders.resume': 'Atsākt',
    'reminders.pause': 'Pauzēt',
    'reminders.none_upcoming': 'Nav gaidāmu atgādinājumu.',
    'reminders.due_today_banner': 'Šodien jāmaksā: {{names}}',
    'reminders.due_multi_banner': '{{count}} maksājumi šodien/kavēti: {{names}}{{extra}}',

    'goal_modal.title': 'Jauns uzkrājuma mērķis',
    'goal_modal.name_label': 'Nosaukums',
    'goal_modal.name_placeholder': 'piem. Ceļojums',
    'goal_modal.amount_label': 'Mērķa summa',
    'goal_modal.months_label': 'Mēnešu skaits',
    'goal_modal.monthly_preview': 'Mēneša maksājums: {{amount}} · pēdējais maksājums ap {{date}}',
    'goal_modal.name_required': 'Ievadi nosaukumu.',
    'goal_modal.amount_required': 'Ievadi derīgu mērķa summu.',
    'goal_modal.months_required': 'Izvēlies mēnešu skaitu.',
    'goals.confirm_delete_achieved': 'Dzēst mērķi "{{name}}" no saraksta?',
    'goals.confirm_delete': 'Dzēst mērķi "{{name}}"? Saistītais rēķins arī tiks dzēsts.',
    'goals.remaining': 'Atlikuši {{count}} maksājumi · aptuveni līdz {{date}}',
    'goals.paid_this_month': '✓ Šomēnes samaksāts',
    'goals.not_paid_this_month': 'Šomēnes vēl nav samaksāts',
    'goals.per_month_of': '{{monthly}} / mēnesī no {{target}} · {{paid}} no {{months}} maksājumiem',
    'goals.delete_title': 'Dzēst mērķi',
    'goals.delete_from_list_title': 'Dzēst no saraksta',
    'goals.achieved_suffix': '{{amount}} sasniegts',
    'goals.achieved_date_suffix': ' · {{date}}',

    'credits.name_placeholder': 'Kredīta nosaukums',
    'credits.drag_title': 'Vilkt, lai pārkārtotu',
    'credits.move_aria': 'Pārvietot',
    'credits.delete_title': 'Dzēst',
    'credits.paid_off': 'nomaksāts',
    'credits.remaining_months': 'atlikuši {{count}} mēn.',
    'credits.pct_paid_suffix': 'nomaksāts · {{rest}}',
    'credits.change_dates': 'Mainīt datumus',
    'credits.no_deadline': 'Bez termiņa',
    'credits.set_dates': 'Uzlikt datumus',
    'credits.monthly_payment_label': 'Mēneša maksājums',
    'credits.minus_title': 'Atņemt no atlikuma',
    'credits.plus_title': 'Pieskaitīt atlikumam (atsaukt)',
    'credits.confirm_delete_named': 'Dzēst kredīta atlikumu "{{name}}"?',
    'credits.confirm_delete': 'Dzēst šo kredīta atlikumu?',
    'credit_dates_modal.title': 'Kredīta termiņš',
    'credit_dates_modal.subtitle': '{{name}} — sākuma un beigu datums parāda nomaksas progresu',
    'credit_dates_modal.start_label': 'Sākuma datums',
    'credit_dates_modal.end_label': 'Beigu datums',
    'credit_dates_modal.hint': 'Progress tiek rēķināts pēc laika (cik no termiņa pagājis). Atstāj tukšu, lai noņemtu termiņu.',
    'credit_dates_modal.end_before_start': 'Beigu datumam jābūt pēc sākuma datuma.',

    'extra_income.name_placeholder': 'Nosaukums (piem. Brīvprātīgais darbs)',
    'extra_income.delete_title': 'Dzēst',
    'extra_income.confirm_delete_named': 'Dzēst papildus ienākumu "{{name}}"?',
    'extra_income.confirm_delete': 'Dzēst šo papildus ienākumu?',

    'summary.base_plus_extra': 'Bāze {{base}} + papildus {{extra}}',
    'summary.spent_prefix': 'iztērēts: {{amount}}',
    'summary.pct_of_income': '{{pct}} % no ieņēmumiem',
    'summary.paid_count': '{{paid}} no {{total}} samaksāti · {{sum}}',
    'summary.remaining_over': 'pāri pēc rēķiniem',
    'summary.remaining_under': 'iztrūkums',
    'summary.overspent_prefix': 'Pārtērēts: ',
    'summary.overspent_item': '{{name}} (+{{amount}})',

    'pace.spent_today_title': 'Iztērēts šodien: {{amount}}',
    'pace.available_now_title': 'Pieejams tagad: {{amount}}',
    'pace.safe_per_day_title': 'Droša summa/dienā: {{amount}} / d.',
    'pace.per_day_suffix': ' / d.',
    'pace.under_status': 'Šodien iztērēts mazāk nekā drošais temps ({{amount}}/d.)',
    'pace.over_status': 'Šodien iztērēts vairāk nekā drošais temps ({{amount}}/d.)',
    'pace.days_left_payday_title': 'Dienas līdz algai: {{count}}',
    'pace.days_left_month_title': 'Dienas līdz mēneša beigām: {{count}}',

    'categories.none': 'Nav datu',
    'categories.usage_count': '{{count}} rēķini',
    'categories.manager_title': 'Kategorijas',
    'categories.manager_hint': 'Pievieno, pārsauc, maini krāsu vai dzēs. "Cits" ir pamatkategorija — dzēšot citu, tās rēķini pāriet uz to.',
    'categories.name_placeholder': 'Kategorijas nosaukums',
    'categories.delete_protected_title': 'Pamatkategoriju nevar dzēst',
    'categories.delete_title': 'Dzēst',
    'categories.add': '+ Pievienot kategoriju',
    'categories.unsaved_hint': 'Nesaglabātas izmaiņas netiek pielietotas',
    'categories.unsaved_status': 'Ir nesaglabātas izmaiņas',
    'categories.saved_status': 'Saglabāts ✓',
    'categories.confirm_delete_used': 'Dzēst "{{name}}"? {{count}} rēķini pāries uz "Cits".',
    'categories.confirm_delete': 'Dzēst "{{name}}"?',
    'categories.name_required': 'Vismaz vienai kategorijai jābūt.',
    'categories.discard_confirm': 'Ir nesaglabātas izmaiņas. Aizvērt bez saglabāšanas?',
    'categories.save_failed': 'Neizdevās saglabāt: {{msg}}',

    'archive.load_failed': 'Neizdevās ielādēt arhīvu: {{code}}',
    'archive.empty': 'Vēl nav arhivētu mēnešu. Mēneša beigās spied "Aizvērt mēnesi → arhīvā".',
    'archive.bills_count': '{{count}} rēķini · ienākumi {{income}}',
    'archive.income_breakdown': ' (bāze {{base}} + papildus {{extra}})',
    'archive.bills_label': 'Rēķini',
    'archive.remaining_label': 'Paliek',
    'archive.view': 'Skatīt',
    'archive.duplicate': 'Dublēt',
    'archive.duplicating': 'Dublē…',
    'archive.confirm_overwrite': 'Mēnesis {{label}} jau ir arhīvā. Pārrakstīt to ar pašreizējiem datiem?',
    'archive.confirm_save': 'Saglabāt {{label}} arhīvā? Pašreizējie dati paliks aktuālajā mēnesī, un arhīvā izveidosies momentuzņēmums.',
    'archive.saved': '{{label}} saglabāts arhīvā ✓',
    'archive.save_failed': 'Neizdevās saglabāt: {{msg}}',
    'archive.duplicate_suffix': ' (kopija)',
    'archive.duplicate_failed': 'Neizdevās dublēt: {{msg}}',
    'archive.confirm_delete': 'Dzēst "{{label}}" no arhīva? To nevar atsaukt.',
    'archive.delete_failed': 'Neizdevās dzēst: {{msg}}',
    'archive.default_entry_name': 'Arhīva ieraksts',
    'archive_modal.archived_on': 'Arhivēts {{date}}',
    'archive_modal.income_title': 'Ienākumi',
    'archive_modal.bills_title': 'Rēķini',
    'archive_modal.add_bill': '+ Pievienot rēķinu',
    'archive_modal.credits_title': 'Kredītu atlikumi',
    'archive_modal.add_credit': '+ Kredīts',
    'archive_modal.view_only': 'Tikai skatīšana',
    'archive_modal.edit': 'Labot',
    'archive_modal.unsaved': 'Ir nesaglabātas izmaiņas',
    'archive_modal.edit_mode': 'Rediģēšanas režīms',
    'archive_modal.save_changes': 'Saglabāt izmaiņas',
    'archive_modal.saving': 'Saglabā…',
    'archive_modal.saved': 'Saglabāts ✓',
    'archive_modal.save_failed': 'Neizdevās saglabāt: {{msg}}',
    'archive_modal.discard_confirm': 'Ir nesaglabātas izmaiņas. Aizvērt bez saglabāšanas?',
    'archive_modal.summing_auto_title': 'Summējošs rēķins — katra epizode jau ir apmaksāta',
    'archive_modal.paid_title': 'Samaksāts',
    'archive_modal.auto_paid_badge': 'Apmaksāts (automātiski)',
    'archive_modal.paid_badge': 'Samaksāts',
    'archive_modal.unpaid_badge': 'Nav samaksāts',
    'archive_modal.sum_from_entries_title': 'Kopsumma no {{count}} epizodēm',
    'archive_modal.drag_title': 'Vilkt',
    'archive_modal.paid_count': '{{paid}} no {{total}} samaksāti · {{sum}}',
    'archive_modal.total_label': 'Atlikums kopā',
    'archive_modal.confirm_delete_bill_named': 'Dzēst rēķinu "{{name}}"?',
    'archive_modal.confirm_delete_bill': 'Dzēst šo rēķinu?',
    'archive_modal.confirm_delete_credit_named': 'Dzēst kredīta atlikumu "{{name}}"?',
    'archive_modal.confirm_delete_credit': 'Dzēst šo kredīta atlikumu?',

    'export.csv_type_bill': 'Rēķins',
    'export.csv_type_credit': 'Kredīts',
    'export.csv_type_extra_income': 'Papildus ienākums',
    'export.csv_header_type': 'Tips',
    'export.csv_header_name': 'Nosaukums',
    'export.csv_header_amount': 'Summa',
    'export.csv_header_category': 'Kategorija',
    'export.csv_header_paid': 'Samaksāts',
    'export.csv_yes': 'Jā',
    'export.csv_no': 'Nē',
    'import.invalid_json': 'Nederīgs fails — neizdevās nolasīt JSON.',
    'import.invalid_data': 'Šis neizskatās pēc derīga finanšu faila (trūkst rēķinu).',
    'import.confirm': 'Importēt šos datus? Tas pārrakstīs pašreizējos rēķinus, kredītus un kategorijas — arī mākonī un citās ierīcēs. (Arhīvs netiek skarts.)',
    'import.done': 'Dati importēti ✓',

    'settings.brand_eyebrow': 'Personīgais budžets',
    'settings.theme_label': 'Krāsu tēma',
    'settings.theme_hint': 'Saglabājas šajā ierīcē',
    'settings.theme_light': '🌙 Gaišā',
    'settings.theme_dark': '☀️ Tumšā',
    'settings.salary_day_label': 'Algas datums',
    'settings.salary_day_hint': '"Droša summa/dienā" rēķinās līdz šai dienai, nevis līdz mēneša beigām',
    'settings.salary_day_none': 'Nav iestatīts',
    'settings.reminder_time_label': 'Atgādinājumu laiks',
    'settings.reminder_time_hint': 'Cikos parādās native paziņojumi šajā ierīcē',
    'settings.version_label': 'Versija',
    'settings.changelog_button': 'Kas jauns',
    'settings.privacy_label': 'Privātums',
    'settings.privacy_hint': 'Kādi dati tiek vākti un kā tos pārvaldīt',
    'settings.privacy_button': 'Privātuma politika',
    'settings.terms_label': 'Noteikumi',
    'settings.terms_hint': 'Lietotnes lietošanas noteikumi',
    'settings.terms_button': 'Lietošanas noteikumi',
    'settings.delete_account_label': 'Dzēst kontu',
    'settings.delete_account_hint': 'Neatgriezeniski dzēš kontu un visus datus',
    'settings.delete_account_button': 'Dzēst kontu',
    'settings.delete_account_confirm1': 'Vai tiešām vēlies neatgriezeniski dzēst savu kontu? Tiks dzēsti VISI dati — rēķini, kredīti, kategorijas un mēnešu arhīvs.',
    'settings.delete_account_confirm2': 'Pilnīgi droši? Šo darbību nevar atsaukt, un dati pazudīs no visām ierīcēm.',
    'settings.deleting': 'Dzēš…',
    'settings.reauth_required': 'Nepieciešams apstiprināt no jauna…',
    'settings.delete_account_failed': 'Neizdevās dzēst kontu: {{msg}}',

    'changelog.title': 'Kas jauns',
    'changelog.subtitle': 'Izmaiņu vēsture · pašreizējā versija v{{version}}',
  },
  en: {
    'app.name': 'Finanšu pārvaldnieks',

    'settings.title': 'Settings',
    'settings.subtitle': 'App appearance and information',
    'settings.language': 'Language',
    'settings.language_hint': 'Saved on this device',
    'lang.lv': 'Latviešu',
    'lang.en': 'English',

    'gate.description': 'Sign in with your Google account to access your budget. Your data is private and accessible only to you.',
    'gate.signin_button': 'Sign in with Google',

    'topbar.hamburger_aria': 'Open menu',
    'topbar.pace_info_aria': 'About spending pace indicators',
    'topbar.sync_status_title': 'Sync status',

    'popover.aria_label': 'Spending pace details',
    'popover.spent_today': 'Spent today',
    'popover.available_now': 'Available now',
    'popover.safe_per_day': 'Safe amount / day',
    'popover.days_left_payday': 'Days until payday',
    'popover.days_left_month': 'Days until end of month',
    'popover.hint': '"Spent today" only counts bills paid today and today’s entries on summing bills. "Available now" = income minus everything actually spent (paid bills + summing bill entries) — different from "Remaining", which also counts unpaid bills.',

    'drawer.nav_aria': 'Main menu',
    'drawer.close_aria': 'Close menu',
    'drawer.sync_connecting': 'Connecting…',
    'drawer.signout': 'Sign out',

    'nav.budget': 'Budget',
    'nav.extra_income': 'Extra income',
    'nav.credits': 'Credits',
    'nav.reminders': 'Reminders',
    'nav.savings': 'Savings goals',
    'nav.trends': 'Trends',
    'nav.settings': 'Settings',
    'nav.install': '⭳ Install app',

    'reminder_banner.view': 'View',
    'reminder_banner.dismiss_title': 'Mark as seen',

    'budget.summary_pin_title': 'Pin summary',
    'budget.summary_unpin_title': 'Unpin summary',
    'budget.income_label': 'Income',
    'budget.total_bills_label': 'Total bills',
    'budget.remaining_label': 'Remaining',
    'budget.to_pay_label': 'Still to pay',
    'budget.bills_title': 'Bills',
    'budget.period_label_title': 'Click to change the month name',
    'budget.sort_bills': 'Sort',
    'budget.new_month': '🗓 New month',
    'budget.add_bill': '+ Add bill',
    'budget.bills_foot_total_label': 'Total',
    'budget.category_breakdown_title': 'Breakdown by category',
    'budget.manage_categories': 'Manage categories',
    'budget.donut_total_label': 'total',
    'budget.archive_title': 'Monthly archive',
    'budget.close_month': '✓ Save current month → archive',
    'budget.export_json': '↓ Export (JSON)',
    'budget.export_csv': '↓ Export (CSV)',
    'budget.import': '↑ Import',

    'extra_income.title': 'Extra income',
    'extra_income.add': '+ Add income',
    'extra_income.total_label': 'Total extra',
    'extra_income.empty': 'No extra income entries yet this month. Add the first one with the button above — for example a one-off job or a gift. It adds to your total income and clears when you start a new month (just like bills).',

    'credits.title': 'Credit balances',
    'credits.add': '+ Credit',
    'credits.total_label': 'Total balance',
    'credits.monthly_label': 'Total monthly payments',

    'reminders.title': 'Reminders',
    'reminders.add': '+ Add reminder',
    'reminders.group_due': 'Today / overdue',
    'reminders.group_upcoming': 'Upcoming',
    'reminders.group_paused': 'Paused',
    'reminders.empty': 'No reminders yet. Add the first one with the button above.',

    'savings.title': 'Savings goals',
    'savings.add': '+ Add new goal',
    'savings.group_achieved': 'Achieved',
    'savings.empty': 'No savings goals yet. Add the first one with the button above — pick an amount and number of months, and the app will split it into monthly payments for you.',

    'trends.title': 'Remaining balance by month',
    'trends.income_expense_title': 'Income vs expenses',
    'trends.category_title': 'Spending by category',
    'trends.empty': 'You need at least 2 archived months to see a trend. Close out months in the "Budget" section to start building history.',

    'common.no_name': '(unnamed)',
    'common.deleted_bill': '(deleted bill)',
    'common.delete_title': 'Delete',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.close': 'Close',
    'common.add': 'Add',
    'default_bill_name': 'Bill',
    'default_credit_name': 'Credit',

    'sync.synced': 'Synced',
    'sync.saving': 'Saving…',
    'sync.error': 'Error: {{code}}',
    'sync.save_failed': 'Save failed',

    'auth.google_not_confirmed': 'Google did not confirm the sign-in',
    'auth.signin_failed': 'Sign-in failed: {{msg}}',
    'auth.signin_error': 'Sign-in error: {{msg}}',
    'auth.signout_confirm': 'Sign out? You will need to sign in with Google again next time.',
    'auth.signout_failed': 'Sign out failed: {{msg}}',

    'notif.reminder_title': 'Reminder',

    'months.1': 'January', 'months.2': 'February', 'months.3': 'March', 'months.4': 'April',
    'months.5': 'May', 'months.6': 'June', 'months.7': 'July', 'months.8': 'August',
    'months.9': 'September', 'months.10': 'October', 'months.11': 'November', 'months.12': 'December',

    'bills.name_placeholder': 'Name',
    'bills.delete_title': 'Delete',
    'bills.planned_limit_title': 'Planned limit',
    'bills.sum_from_entries_title': 'Total from entries',
    'bills.add_entry_title': 'Add entry',
    'bills.drag_title': 'Drag to reorder',
    'bills.move_aria': 'Move',
    'bills.summing_auto_title': 'Summing bill — each entry is already paid',
    'bills.mark_paid_title': 'Mark as paid',
    'bills.paid_aria': 'Paid',
    'bills.delete_locked_title': 'Delete from the "Savings goals" section',
    'bills.spent_prefix': 'Spent',
    'bills.spent_of': 'of {{limit}}',
    'bills.no_limit_suffix': 'no limit',
    'bills.overspent': 'overspent {{amount}}',
    'bills.show_entries_title': 'Show entries',
    'bills.collapse_entries_title': 'Collapse entries',
    'bills.change_limit': 'Change limit',
    'bills.set_limit': 'Set limit',
    'bills.delete_entry_title': 'Delete entry',
    'bills.no_entries_yet': 'No entries yet — add with "+"',
    'bills.cant_delete_goal_linked': 'This bill can’t be deleted from the bills list — delete the goal in the "Savings goals" section.',
    'bills.confirm_delete_named': 'Delete bill "{{name}}"?',
    'bills.confirm_delete': 'Delete this bill?',
    'bills.confirm_delete_entry': 'Delete entry {{amount}}{{date}}?',
    'bills.new_bill_title': 'New bill',
    'bills.new_bill_subtitle': 'Choose the bill type',
    'bills.normal_title': 'Regular bill',
    'bills.normal_desc': 'Fixed monthly amount (e.g. rent, utilities)',
    'bills.summing_title': 'Summing bill',
    'bills.summing_desc': 'Builds up all month, add entries with "+" (e.g. fuel)',

    'entry_modal.title': 'Add entry',
    'entry_modal.subtitle': '{{name}} — currently {{amount}}',
    'entry_modal.amount_label': 'Amount €',
    'entry_modal.note_label': 'Note (optional)',
    'entry_modal.note_placeholder': 'e.g. fuel top-up',
    'entry_modal.date_label': 'Date',
    'entry_modal.amount_required': 'Enter an amount greater than 0.',

    'limit_modal.title': 'Monthly limit',
    'limit_modal.subtitle': '{{name}} — planned monthly maximum',
    'limit_modal.amount_label': 'Limit € (leave empty to remove)',
    'limit_modal.hint': 'If you set a limit, "Total bills" will use this planned amount instead of what was actually spent.',
    'limit_modal.invalid_amount': 'Enter a valid amount.',

    'new_month.no_bills': 'There are no bills to reset.',
    'new_month.title': 'New month',
    'new_month.hint': 'Check the bills that repeat every month and should be kept. Unchecked ones will be deleted. Summing bills will have their entries cleared (the limit stays), and all kept bills will have their "Paid" checkmarks removed.',
    'new_month.hint_archive': 'If you save to the archive, it will be named "{{label}}".',
    'new_month.hint_rename': 'After the reset, the working period name will automatically change to "{{label}}" — you can rename it later by clicking the name next to "Bills".',
    'new_month.hint_goals': ' Savings goal payments carry over automatically — they aren’t in this list.',
    'new_month.archive_first': 'Save this month to the archive first',
    'new_month.confirm_btn': 'Start new month',
    'new_month.confirm_removal': 'Start a new month? {{count}} bill(s) will be permanently deleted.',
    'new_month.archive_failed': 'Failed to save to the archive: {{msg}} — the month reset was cancelled so no data is lost.',
    'new_month.done': 'New month ready ✓',

    'reminder_modal.title': 'Add reminder',
    'reminder_modal.linked_tab': 'Linked to a bill',
    'reminder_modal.free_tab': 'Free-form reminder',
    'reminder_modal.bill_label': 'Bill',
    'reminder_modal.day_label': 'Day of month (1–31)',
    'reminder_modal.day_hint': 'The reminder automatically repeats every month on this day — even after "New month".',
    'reminder_modal.name_label': 'Name',
    'reminder_modal.name_placeholder': 'e.g. Car inspection',
    'reminder_modal.date_label': 'Date',
    'reminder_modal.invalid_day': 'Enter a valid day (1–31).',
    'reminder_modal.name_required': 'Enter a name.',
    'reminder_modal.date_required': 'Choose a date.',
    'reminders.confirm_delete': 'Delete reminder "{{name}}"?',
    'reminders.paused_suffix': 'Paused',
    'reminders.paused_bill_inactive': ' — bill is no longer active',
    'reminders.paid_next': '✓ Paid — next time {{date}}',
    'reminders.due_today': 'Due today',
    'reminders.overdue': 'Overdue — was due {{date}}',
    'reminders.monthly_around': 'Every month around the {{day}}. · next time {{date}}',
    'reminders.due_date': 'Due: {{date}}',
    'reminders.resume': 'Resume',
    'reminders.pause': 'Pause',
    'reminders.none_upcoming': 'No upcoming reminders.',
    'reminders.due_today_banner': 'Due today: {{names}}',
    'reminders.due_multi_banner': '{{count}} payments due/overdue today: {{names}}{{extra}}',

    'goal_modal.title': 'New savings goal',
    'goal_modal.name_label': 'Name',
    'goal_modal.name_placeholder': 'e.g. Trip',
    'goal_modal.amount_label': 'Target amount',
    'goal_modal.months_label': 'Number of months',
    'goal_modal.monthly_preview': 'Monthly payment: {{amount}} · last payment around {{date}}',
    'goal_modal.name_required': 'Enter a name.',
    'goal_modal.amount_required': 'Enter a valid target amount.',
    'goal_modal.months_required': 'Choose a number of months.',
    'goals.confirm_delete_achieved': 'Remove goal "{{name}}" from the list?',
    'goals.confirm_delete': 'Delete goal "{{name}}"? The linked bill will also be deleted.',
    'goals.remaining': '{{count}} payments left · around {{date}}',
    'goals.paid_this_month': '✓ Paid this month',
    'goals.not_paid_this_month': 'Not paid yet this month',
    'goals.per_month_of': '{{monthly}} / month of {{target}} · {{paid}} of {{months}} payments',
    'goals.delete_title': 'Delete goal',
    'goals.delete_from_list_title': 'Remove from list',
    'goals.achieved_suffix': '{{amount}} reached',
    'goals.achieved_date_suffix': ' · {{date}}',

    'credits.name_placeholder': 'Credit name',
    'credits.drag_title': 'Drag to reorder',
    'credits.move_aria': 'Move',
    'credits.delete_title': 'Delete',
    'credits.paid_off': 'paid off',
    'credits.remaining_months': '{{count}} mo. left',
    'credits.pct_paid_suffix': 'paid off · {{rest}}',
    'credits.change_dates': 'Change dates',
    'credits.no_deadline': 'No deadline',
    'credits.set_dates': 'Set dates',
    'credits.monthly_payment_label': 'Monthly payment',
    'credits.minus_title': 'Subtract from balance',
    'credits.plus_title': 'Add back to balance (undo)',
    'credits.confirm_delete_named': 'Delete credit balance "{{name}}"?',
    'credits.confirm_delete': 'Delete this credit balance?',
    'credit_dates_modal.title': 'Credit term',
    'credit_dates_modal.subtitle': '{{name}} — start and end date show payoff progress',
    'credit_dates_modal.start_label': 'Start date',
    'credit_dates_modal.end_label': 'End date',
    'credit_dates_modal.hint': 'Progress is calculated by time elapsed. Leave empty to remove the term.',
    'credit_dates_modal.end_before_start': 'The end date must be after the start date.',

    'extra_income.name_placeholder': 'Name (e.g. Freelance work)',
    'extra_income.delete_title': 'Delete',
    'extra_income.confirm_delete_named': 'Delete extra income "{{name}}"?',
    'extra_income.confirm_delete': 'Delete this extra income?',

    'summary.base_plus_extra': 'Base {{base}} + extra {{extra}}',
    'summary.spent_prefix': 'spent: {{amount}}',
    'summary.pct_of_income': '{{pct}}% of income',
    'summary.paid_count': '{{paid}} of {{total}} paid · {{sum}}',
    'summary.remaining_over': 'left after bills',
    'summary.remaining_under': 'shortfall',
    'summary.overspent_prefix': 'Overspent: ',
    'summary.overspent_item': '{{name}} (+{{amount}})',

    'pace.spent_today_title': 'Spent today: {{amount}}',
    'pace.available_now_title': 'Available now: {{amount}}',
    'pace.safe_per_day_title': 'Safe amount/day: {{amount}} / day',
    'pace.per_day_suffix': ' / day',
    'pace.under_status': 'Spent less today than the safe pace ({{amount}}/day)',
    'pace.over_status': 'Spent more today than the safe pace ({{amount}}/day)',
    'pace.days_left_payday_title': 'Days until payday: {{count}}',
    'pace.days_left_month_title': 'Days until end of month: {{count}}',

    'categories.none': 'No data',
    'categories.usage_count': '{{count}} bills',
    'categories.manager_title': 'Categories',
    'categories.manager_hint': 'Add, rename, recolor, or delete. "Other" is the base category — deleting another one moves its bills there.',
    'categories.name_placeholder': 'Category name',
    'categories.delete_protected_title': 'The base category can’t be deleted',
    'categories.delete_title': 'Delete',
    'categories.add': '+ Add category',
    'categories.unsaved_hint': 'Unsaved changes aren’t applied yet',
    'categories.unsaved_status': 'You have unsaved changes',
    'categories.saved_status': 'Saved ✓',
    'categories.confirm_delete_used': 'Delete "{{name}}"? {{count}} bills will move to "Other".',
    'categories.confirm_delete': 'Delete "{{name}}"?',
    'categories.name_required': 'At least one category is required.',
    'categories.discard_confirm': 'You have unsaved changes. Close without saving?',
    'categories.save_failed': 'Failed to save: {{msg}}',

    'archive.load_failed': 'Failed to load the archive: {{code}}',
    'archive.empty': 'No archived months yet. At the end of the month, press "Close month → archive".',
    'archive.bills_count': '{{count}} bills · income {{income}}',
    'archive.income_breakdown': ' (base {{base}} + extra {{extra}})',
    'archive.bills_label': 'Bills',
    'archive.remaining_label': 'Remaining',
    'archive.view': 'View',
    'archive.duplicate': 'Duplicate',
    'archive.duplicating': 'Duplicating…',
    'archive.confirm_overwrite': 'Month {{label}} is already in the archive. Overwrite it with the current data?',
    'archive.confirm_save': 'Save {{label}} to the archive? The current data stays in the working month, and a snapshot is created in the archive.',
    'archive.saved': '{{label}} saved to the archive ✓',
    'archive.save_failed': 'Failed to save: {{msg}}',
    'archive.duplicate_suffix': ' (copy)',
    'archive.duplicate_failed': 'Failed to duplicate: {{msg}}',
    'archive.confirm_delete': 'Delete "{{label}}" from the archive? This cannot be undone.',
    'archive.delete_failed': 'Failed to delete: {{msg}}',
    'archive.default_entry_name': 'Archive entry',
    'archive_modal.archived_on': 'Archived {{date}}',
    'archive_modal.income_title': 'Income',
    'archive_modal.bills_title': 'Bills',
    'archive_modal.add_bill': '+ Add bill',
    'archive_modal.credits_title': 'Credit balances',
    'archive_modal.add_credit': '+ Credit',
    'archive_modal.view_only': 'View only',
    'archive_modal.edit': 'Edit',
    'archive_modal.unsaved': 'You have unsaved changes',
    'archive_modal.edit_mode': 'Edit mode',
    'archive_modal.save_changes': 'Save changes',
    'archive_modal.saving': 'Saving…',
    'archive_modal.saved': 'Saved ✓',
    'archive_modal.save_failed': 'Failed to save: {{msg}}',
    'archive_modal.discard_confirm': 'You have unsaved changes. Close without saving?',
    'archive_modal.summing_auto_title': 'Summing bill — each entry is already paid',
    'archive_modal.paid_title': 'Paid',
    'archive_modal.auto_paid_badge': 'Paid (automatic)',
    'archive_modal.paid_badge': 'Paid',
    'archive_modal.unpaid_badge': 'Not paid',
    'archive_modal.sum_from_entries_title': 'Total from {{count}} entries',
    'archive_modal.drag_title': 'Drag',
    'archive_modal.paid_count': '{{paid}} of {{total}} paid · {{sum}}',
    'archive_modal.total_label': 'Total balance',
    'archive_modal.confirm_delete_bill_named': 'Delete bill "{{name}}"?',
    'archive_modal.confirm_delete_bill': 'Delete this bill?',
    'archive_modal.confirm_delete_credit_named': 'Delete credit balance "{{name}}"?',
    'archive_modal.confirm_delete_credit': 'Delete this credit balance?',

    'export.csv_type_bill': 'Bill',
    'export.csv_type_credit': 'Credit',
    'export.csv_type_extra_income': 'Extra income',
    'export.csv_header_type': 'Type',
    'export.csv_header_name': 'Name',
    'export.csv_header_amount': 'Amount',
    'export.csv_header_category': 'Category',
    'export.csv_header_paid': 'Paid',
    'export.csv_yes': 'Yes',
    'export.csv_no': 'No',
    'import.invalid_json': 'Invalid file — couldn’t parse JSON.',
    'import.invalid_data': 'This doesn’t look like a valid finance file (missing bills).',
    'import.confirm': 'Import this data? It will overwrite your current bills, credits and categories — also in the cloud and on other devices. (The archive is not affected.)',
    'import.done': 'Data imported ✓',

    'settings.brand_eyebrow': 'Personal budget',
    'settings.theme_label': 'Color theme',
    'settings.theme_hint': 'Saved on this device',
    'settings.theme_light': '🌙 Light',
    'settings.theme_dark': '☀️ Dark',
    'settings.salary_day_label': 'Payday',
    'settings.salary_day_hint': '"Safe amount/day" is calculated up to this day, instead of the end of the month',
    'settings.salary_day_none': 'Not set',
    'settings.reminder_time_label': 'Reminder time',
    'settings.reminder_time_hint': 'What time native notifications appear on this device',
    'settings.version_label': 'Version',
    'settings.changelog_button': "What's new",
    'settings.privacy_label': 'Privacy',
    'settings.privacy_hint': 'What data is collected and how to manage it',
    'settings.privacy_button': 'Privacy policy',
    'settings.terms_label': 'Terms',
    'settings.terms_hint': 'The app’s terms of use',
    'settings.terms_button': 'Terms of use',
    'settings.delete_account_label': 'Delete account',
    'settings.delete_account_hint': 'Permanently deletes the account and all data',
    'settings.delete_account_button': 'Delete account',
    'settings.delete_account_confirm1': 'Are you sure you want to permanently delete your account? ALL data will be deleted — bills, credits, categories and the monthly archive.',
    'settings.delete_account_confirm2': 'Absolutely sure? This action cannot be undone, and the data will disappear from all devices.',
    'settings.deleting': 'Deleting…',
    'settings.reauth_required': 'Please confirm again…',
    'settings.delete_account_failed': 'Failed to delete account: {{msg}}',

    'changelog.title': "What's new",
    'changelog.subtitle': 'Change history · current version v{{version}}',
  },
};

let currentLang = DEFAULT_LANG;
const listeners = [];
const pluralRulesCache = {};

export function getLang() {
  return currentLang;
}

// BCP47 locale for Number/Date formatting (thousands/decimal separators etc.) —
// kept separate from the UI string language so callers like `fmt()` don't need
// their own lv/en mapping.
export function currentLocale() {
  return currentLang === 'en' ? 'en-US' : 'lv-LV';
}

// Lasa saglabāto valodu no localStorage un iestata <html lang>. Jāsauc VIENU
// reizi, cik ātri vien iespējams pēc moduļa ielādes (nav atkarīgs no DOM).
// Ja lietotājs vēl NEKAD nav pats izvēlējies valodu (nav localStorage ieraksta),
// mēģina noteikt to no pārlūka/sistēmas valodas (navigator.language) — tas ir
// vienreizējs pirmā palaišanas brīža uzminējums, ne pastāvīga sekošana sistēmai;
// tiklīdz lietotājs izvēlas valodu Iestatījumos (setLang()), tā saglabājas
// localStorage un vienmēr uzvar pār sistēmas valodu turpmāk.
export function initI18n() {
  let saved;
  try { saved = localStorage.getItem(LANG_STORAGE_KEY); } catch (e) {}
  if (saved && SUPPORTED_LANGS.includes(saved)) {
    currentLang = saved;
  } else {
    const browserLang = (navigator.language || '').slice(0, 2).toLowerCase();
    currentLang = SUPPORTED_LANGS.includes(browserLang) ? browserLang : DEFAULT_LANG;
  }
  document.documentElement.lang = currentLang;
}

export function setLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang) || lang === currentLang) return;
  currentLang = lang;
  try { localStorage.setItem(LANG_STORAGE_KEY, lang); } catch (e) {}
  document.documentElement.lang = lang;
  listeners.forEach(fn => fn(lang));
}

// Reģistrē callback, kas izsaukts pēc katras setLang() maiņas — ekrāni, kas
// jau uzbūvēti (piem. atvērts modālis), var pārzīmēt savu tekstu.
export function onLangChange(fn) {
  listeners.push(fn);
}

function pluralCategory(lang, count) {
  try {
    if (!pluralRulesCache[lang]) pluralRulesCache[lang] = new Intl.PluralRules(lang);
    return pluralRulesCache[lang].select(count);
  } catch (e) {
    return count === 1 ? 'one' : 'other';
  }
}

function interpolate(str, params) {
  if (!params) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (m, key) => (key in params ? params[key] : m));
}

// t('settings.title') → vienkārša virkne
// t('bills.count', {count: n}) → izvēlas pareizo skaitļa formu pēc `count`
// un aizvieto {{count}}/citus {{param}} vietturus rezultātā.
export function t(key, params) {
  let entry = STRINGS[currentLang]?.[key];
  if (entry === undefined) entry = STRINGS[DEFAULT_LANG]?.[key];
  if (entry === undefined) return key;

  if (entry && typeof entry === 'object') {
    const count = typeof params?.count === 'number' ? params.count : 0;
    const cat = pluralCategory(currentLang, count);
    entry = entry[cat] ?? entry.other ?? Object.values(entry)[0];
  }
  return interpolate(entry, params);
}

// Aizpilda visus `[data-i18n]` (textContent) un `[data-i18n-attr]`
// (`"attr1:key1|attr2:key2"`) elementus zem `root` ar pašreizējās valodas
// tekstu. Statiskajam index.html marķējumam — dinamiski JS uzbūvētais
// saturs izsauc t() tieši.
export function applyStaticTranslations(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-attr]').forEach(el => {
    el.dataset.i18nAttr.split('|').forEach(pair => {
      const [attr, key] = pair.split(':');
      if (attr && key) el.setAttribute(attr, t(key));
    });
  });
}
