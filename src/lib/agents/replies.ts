export type Lang = "en" | "hi" | "mr";
type Key =
  | "qty"
  | "unit"
  | "product"
  | "total"
  | "remaining"
  | "stock"
  | "amount"
  | "category"
  | "customer"
  | "balance"
  | "count"
  | "profit"
  | "sales"
  | "expenses"
  | "list"
  | "days"
  | "reason";
export type Vars = Partial<Record<Key, string | number>>;
type Dict = Record<string, (v: Vars) => string>;
const en: Dict = {
  sale: (v) =>
    `Your sale of ${v.qty} ${v.unit} of ${v.product} has been recorded for ₹${v.total}. Remaining stock is ${v.remaining} ${v.unit}.`,
  restock: (v) => `Added ${v.qty} ${v.unit} of ${v.product}. Stock is now ${v.stock} ${v.unit}.`,
  expense: (v) => `Expense of ₹${v.amount} for ${v.category} recorded.`,
  credit: (v) => `₹${v.amount} credit added for ${v.customer}. They now owe ₹${v.balance}.`,
  payment: (v) =>
    `Payment of ₹${v.amount} received from ${v.customer}. Balance left ₹${v.balance}.`,
  stock: (v) => `${v.product} stock is ${v.qty} ${v.unit}.`,
  today: (v) =>
    `Today you made ${v.count} sales worth ₹${v.total}, with about ₹${v.profit} profit.`,
  profit: (v) =>
    `In the last 7 days: sales ₹${v.sales}, expenses ₹${v.expenses}, estimated profit ₹${v.profit}.`,
  low: (v) => (v.list ? `Low stock: ${v.list}.` : `No products are low on stock.`),
  restockAdvice: (v) =>
    v.list ? `I recommend ordering: ${v.list}.` : `No restocking needed this week.`,
  forecast: (v) =>
    `${v.product} is expected to sell about ${v.qty} ${v.unit} in the next 7 days.${v.days !== undefined && v.days !== "" ? ` Stock may run out in ${v.days} days.` : ""}`,
  dues: (v) => (v.list ? `Customers owing money: ${v.list}.` : `No pending dues.`),
  confirm: () => `Please check and confirm before I save this.`,
  blocked: (v) => `I can't do this: ${v.reason}`,
  unclear: () => `Sorry, I didn't understand. Please say it again.`,
  cancelled: () => `Okay, cancelled. Nothing was saved.`,
};
const hi: Dict = {
  sale: (v) =>
    `${v.product} की ${v.qty} ${v.unit} की बिक्री ₹${v.total} में दर्ज हो गई। बचा हुआ स्टॉक ${v.remaining} ${v.unit} है।`,
  restock: (v) => `${v.product} के ${v.qty} ${v.unit} जोड़े गए। अब स्टॉक ${v.stock} ${v.unit} है।`,
  expense: (v) => `${v.category} का ₹${v.amount} खर्च दर्ज हो गया।`,
  credit: (v) => `${v.customer} के खाते में ₹${v.amount} उधार जोड़ा गया। कुल बाकी ₹${v.balance}।`,
  payment: (v) => `${v.customer} से ₹${v.amount} मिले। बाकी ₹${v.balance}।`,
  stock: (v) => `${v.product} का स्टॉक ${v.qty} ${v.unit} है।`,
  today: (v) => `आज ${v.count} बिक्री हुई, कुल ₹${v.total}, लगभग ₹${v.profit} मुनाफा।`,
  profit: (v) =>
    `पिछले 7 दिन: बिक्री ₹${v.sales}, खर्च ₹${v.expenses}, अनुमानित मुनाफा ₹${v.profit}।`,
  low: (v) => (v.list ? `कम स्टॉक: ${v.list}।` : `कोई सामान कम नहीं है।`),
  restockAdvice: (v) =>
    v.list ? `यह मंगवाइए: ${v.list}।` : `इस हफ्ते कुछ मंगवाने की ज़रूरत नहीं।`,
  forecast: (v) =>
    `अगले 7 दिनों में ${v.product} की लगभग ${v.qty} ${v.unit} बिक्री होगी।${v.days !== undefined && v.days !== "" ? ` स्टॉक ${v.days} दिन में खत्म हो सकता है।` : ""}`,
  dues: (v) => (v.list ? `बाकी पैसे: ${v.list}।` : `कोई बकाया नहीं है।`),
  confirm: () => `सेव करने से पहले कृपया जाँच कर पुष्टि करें।`,
  blocked: (v) => `यह नहीं हो सकता: ${v.reason}`,
  unclear: () => `माफ़ कीजिए, समझ नहीं आया। कृपया फिर से बोलिए।`,
  cancelled: () => `ठीक है, रद्द कर दिया। कुछ सेव नहीं हुआ।`,
};
const mr: Dict = {
  sale: (v) =>
    `${v.product} ची ${v.qty} ${v.unit} विक्री ₹${v.total} ला नोंदवली. उरलेला स्टॉक ${v.remaining} ${v.unit}.`,
  restock: (v) => `${v.product} चे ${v.qty} ${v.unit} जोडले. आता स्टॉक ${v.stock} ${v.unit}.`,
  expense: (v) => `${v.category} चा ₹${v.amount} खर्च नोंदवला.`,
  credit: (v) => `${v.customer} च्या खात्यात ₹${v.amount} उधारी जोडली. एकूण बाकी ₹${v.balance}.`,
  payment: (v) => `${v.customer} कडून ₹${v.amount} मिळाले. बाकी ₹${v.balance}.`,
  stock: (v) => `${v.product} चा स्टॉक ${v.qty} ${v.unit} आहे.`,
  today: (v) => `आज ${v.count} विक्री, एकूण ₹${v.total}, अंदाजे ₹${v.profit} नफा.`,
  profit: (v) => `मागील 7 दिवस: विक्री ₹${v.sales}, खर्च ₹${v.expenses}, अंदाजे नफा ₹${v.profit}.`,
  low: (v) => (v.list ? `कमी स्टॉक: ${v.list}.` : `कोणताही माल कमी नाही.`),
  restockAdvice: (v) => (v.list ? `हे मागवा: ${v.list}.` : `या आठवड्यात काही मागवायची गरज नाही.`),
  forecast: (v) =>
    `पुढील 7 दिवसांत ${v.product} ची सुमारे ${v.qty} ${v.unit} विक्री अपेक्षित.${v.days !== undefined && v.days !== "" ? ` स्टॉक ${v.days} दिवसांत संपू शकतो.` : ""}`,
  dues: (v) => (v.list ? `बाकी पैसे: ${v.list}.` : `कोणतीही थकबाकी नाही.`),
  confirm: () => `सेव करण्यापूर्वी कृपया तपासून खात्री करा.`,
  blocked: (v) => `हे करता येणार नाही: ${v.reason}`,
  unclear: () => `माफ करा, समजलं नाही. कृपया पुन्हा सांगा.`,
  cancelled: () => `ठीक आहे, रद्द केलं. काहीही सेव झालं नाही.`,
};
const dicts: Record<Lang, Dict> = { en, hi, mr };
export function t(lang: Lang, key: string, v: Vars = {}): string {
  const fn = dicts[lang][key] ?? en[key];
  return fn ? fn(v) : key;
}
