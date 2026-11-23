/**
 * PACT interface strings dictionary.
 * Strictly adheres to U7 (Words) and layman-first guidelines:
 * - Direct, warm, plain-spoken
 * - Always speaks to "you"
 * - Buttons are verbs with their object ("Pay ₹720", "Add to my list")
 * - No internal jargon or technical error codes
 */

export const copy = {
  brand: {
    name: "PACT",
    tagline: "One building. One monthly order. One fair split bill.",
    subtagline:
      "Your building buys together once a month from trusted local stores, unlocks wholesale pricing, and splits the bill fairly.",
  },

  terms: {
    community: "your building",
    customerCart: "My list",
    communityCart: "Our building's order",
    invoice: "My bill",
    store: "the store",
    code: "6-digit code",
    communityDiscount: "Community discount",
    delivery: "Delivery",
  },

  status: {
    toPay: "To pay",
    checkingPayment: "Checking your payment…",
    paid: "Paid",
    readyToDeliver: "Ready to deliver",
    onTheWay: "On the way",
    delivered: "Delivered",
    sentToStore: "Sent to the store",
    storePacking: "The store is packing your order",
    notAvailableThisMonth: "Not available this month",
  },

  auth: {
    welcome: "Welcome to PACT",
    signInSubtitle: "Sign in with your mobile number to access your building's monthly order.",
    phoneLabel: "Mobile number",
    phonePlaceholder: "99999 00001",
    sendCode: "Send code",
    sendingCode: "Sending code…",
    verifyCodeTitle: "Enter 6-digit code",
    verifyCodeSubtitle: "We sent a 6-digit code to",
    verifyCodeButton: "Verify and continue",
    resendPrefix: "Didn't get it?",
    resendWait: (seconds: number) => `Send again in 0:${seconds < 10 ? `0${seconds}` : seconds}`,
    resendNow: "Send again",
    devQuickSignIn: "Quick Sign-In (Dev mode)",
    toggleType: "Type",
    toggleSpeak: "Speak",
    signOut: "Sign out",
  },

  onboarding: {
    chooseRoleTitle: "Welcome to your neighbourhood",
    chooseRoleSubtitle: "How would you like to join PACT today?",
    residentOptionTitle: "I live here",
    residentOptionDesc: "Join your apartment building's shared monthly grocery order.",
    retailerOptionTitle: "I run a store",
    retailerOptionDesc: "Supply monthly grocery orders to apartment communities near you.",

    // Resident onboarding
    joinTitle: "Which building do you live in?",
    joinSubtitle: "Enter the join code shared by your building committee or neighbour.",
    joinCodeLabel: "Building join code",
    joinCodePlaceholder: "e.g. GREEN1 or LAKE01",
    nameLabel: "Your full name",
    namePlaceholder: "e.g. Asha Rao",
    flatLabel: "Flat / Apartment number",
    flatPlaceholder: "e.g. A-101",
    joinButton: "Join my building",

    // Retailer onboarding
    storeTitle: "Register your store",
    storeSubtitle: "Set up your storefront to receive consolidated monthly orders.",
    storeNameLabel: "Store name",
    storeNamePlaceholder: "e.g. Sri Lakshmi Stores",
    addressLabel: "Store address",
    addressPlaceholder: "e.g. Shop 4, Green Glen Layout, Bellandur",
    gstinLabel: "GSTIN (optional)",
    gstinPlaceholder: "29AAAAA0000A1Z5",
    gstinBadge: "Format checked · not government-verified",
    registerButton: "Submit store registration",
    pendingApprovalTitle: "Waiting for approval",
    pendingApprovalBody: "Your store registration has been received. A PACT platform administrator will verify and activate your store shortly.",
  },

  customerStart: {
    title: "How would you like to order?",
    subtitle: "You can switch any time from the top bar.",
    typeTitle: "Type & tap",
    typeDesc: "Browse the visual catalogue, tap variants, and adjust quantities with simple buttons.",
    speakTitle: "Speak",
    speakDesc: "Say your list naturally in English or Hindi. We will interpret your items automatically.",
  },

  customer: {
    nav: {
      home: "Home",
      shop: "Shop",
      list: "My list",
      bills: "Bills",
    },
    home: {
      orderClosingBanner: (days: number) =>
        days === 0
          ? "Ordering for this month closes today at midnight."
          : `Ordering for this month closes in ${days} days.`,
      closedNotice: "Ordering for this month has closed. You can add items again from 1st of next month.",
      buildingOrderSummary: (residents: number, items: number) =>
        `Our building this month: ${residents} neighbours, ${items} items.`,
      viewList: "View my list",
      browseShop: "Browse catalogue",
    },
    shop: {
      searchPlaceholder: "Search groceries (e.g. rice, atta, oil, दाल)...",
      estimatedPricePrefix: "About",
      addToList: "Add to my list",
    },
    list: {
      title: "My list",
      emptyTitle: "Your list is empty",
      emptyBody: "You haven't added any groceries for this month's order yet.",
      addGroceriesButton: "Browse catalogue",
      estimatedTotal: "Estimated total",
      estimateDisclaimer: "The store confirms the final price when it packs.",
      buildingOrderHeader: "Our building's order",
      buildingOrderSummary: "Consolidated items from all neighbours in your building (anonymous).",
      undoRemove: "Undo",
      itemRemoved: "Item removed from your list",
    },
    bill: {
      title: "My bill",
      emptyTitle: "No bills ready",
      emptyBody: "Your bill will be ready once the store finishes packing this month's consolidated order.",
      breakdownTitle: "Bill breakdown",
      itemsSubtotal: "Your items",
      communityDiscount: "Community discount",
      deliveryCharge: "Delivery",
      totalPayable: "You pay",
      howCalculatedTitle: "How is this calculated?",
      howCalculatedText:
        "Your building's items were ordered in bulk, securing a wholesale discount. This discount is split fairly based on what you ordered. Delivery is split equally among all participating neighbours.",
      payButton: (amount: string) => `Pay ${amount}`,
    },
  },

  retailer: {
    nav: {
      dashboard: "Dashboard",
      orders: "Orders",
      inventory: "Inventory",
      payments: "Payments",
    },
    dashboard: {
      title: "Store Dashboard",
      salesThisMonth: "Sales this month",
      activeCommunities: "Assigned communities",
      ordersToPack: "Orders to pack",
      lowStockAlerts: "Low stock alerts",
    },
  },

  admin: {
    nav: {
      overview: "Overview",
      paid: "Paid",
      unpaid: "Unpaid",
    },
    overview: {
      title: "Building Coordinator Dashboard",
      participatingResidents: "Participating neighbours",
      totalBill: "Total building bill",
      amountCollected: "Amount collected",
      pendingCollection: "Pending payment",
      deliveredCount: "Delivered",
    },
    actions: {
      markReady: "Mark ready",
      outForDelivery: "Out for delivery",
      delivered: "Delivered",
      sendReminder: "Send reminder",
      remindAllUnpaid: (count: number) => `Remind all unpaid (${count})`,
    },
  },

  platform: {
    nav: {
      stores: "Stores",
      communities: "Communities",
      requests: "Product Requests",
    },
    title: "Platform Administration",
  },

  errors: {
    cartLocked: "Ordering for this month has closed. You can add items again from 1 Dec.",
    paymentFailed: "Your payment did not go through. You have not been charged. Try again.",
    networkDown: "No internet right now. Your list is saved. We'll keep trying.",
    voiceNotUnderstood: "I didn't catch that. Tap the mic and try again, or type it.",
    nothingPacked: "The store couldn't pack any of your items this month. There is nothing to pay.",
  },
};
