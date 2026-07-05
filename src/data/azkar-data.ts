export interface Dhikr {
  id: string;
  text: string;
  translation: string;
  count: number;
  source?: string;
}

export interface AzkarCategory {
  id: string;
  name: string;
  nameAr: string;
  icon?: string;
  sectionId: string;
  items: Dhikr[];
}

export interface AzkarSection {
  id: string;
  nameAr: string;
  name: string;
  categoryIds: string[];
}

export const azkarSections: AzkarSection[] = [
  {
    id: "daily",
    nameAr: "الأذكار اليومية",
    name: "Daily Routine",
    categoryIds: ["waking", "morning", "evening", "sleep", "clothing", "home", "leaving-home", "returning-home", "toilet", "ablution", "mirror"],
  },
  {
    id: "prayer",
    nameAr: "أذكار الصلاة",
    name: "Prayer",
    categoryIds: ["adhan", "after-adhan", "going-mosque", "entering-mosque", "leaving-mosque", "opening-prayer", "ruku", "sujood", "tashahhud", "after-prayer", "witr-qunut", "istikharah", "friday"],
  },
  {
    id: "eating",
    nameAr: "الأكل والصيام",
    name: "Eating & Fasting",
    categoryIds: ["before-eating", "after-eating", "when-fasting", "breaking-fast", "guest-food", "drinking-milk", "drinking-water"],
  },
  {
    id: "travel",
    nameAr: "أذكار السفر",
    name: "Travel & Movement",
    categoryIds: ["riding-vehicle", "travel-supplication", "entering-town", "entering-market", "returning-travel", "hajj-umrah"],
  },
  {
    id: "social",
    nameAr: "المجتمع والأسرة",
    name: "Social & Family",
    categoryIds: ["greeting", "entering-house", "gatherings", "sneezing", "yawning", "anger", "newborn", "marriage", "congratulations", "responding-kindness", "responding-love", "visiting-sick", "condolence"],
  },
  {
    id: "hardship",
    nameAr: "الشدة والمرض",
    name: "Hardship & Illness",
    categoryIds: ["distress", "anxiety", "debt", "facing-enemy", "ruqyah", "hasad", "sickness-self", "sickness-other", "closing-eyes-deceased", "funeral", "burial", "grave-visit"],
  },
  {
    id: "weather",
    nameAr: "الطقس والكون",
    name: "Weather & Nature",
    categoryIds: ["wind", "thunder", "rain-dua", "rain-after", "crescent-moon", "clear-weather"],
  },
  {
    id: "virtue",
    nameAr: "الفضائل والعبادات",
    name: "Virtue & Worship",
    categoryIds: ["general", "istighfar", "salawat", "quran-recitation", "various-duas", "kaffaratul-majlis"],
  },
];

export const azkarData: AzkarCategory[] = [
  {
    id: "waking",
    name: "Waking Up",
    nameAr: "أذكار الاستيقاظ",
    sectionId: "daily",
    items: [
      { id: "w1", text: "الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ", translation: "All praise is for Allah who gave us life after having taken it from us, and unto Him is the resurrection.", count: 1 },
      { id: "w2", text: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ", translation: "None has the right to be worshipped but Allah alone, with no partner. His is the dominion and His is the praise, and He is Able to do all things. Glory is to Allah. Praise is to Allah. None has the right to be worshipped but Allah. Allah is the Greatest. There is no might and no power except with Allah, the Most High, the Most Great.", count: 1, source: "رواه البخاري" },
      { id: "w3", text: "اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ هَذَا الْيَوْمِ فَتْحَهُ وَنَصْرَهُ وَنُورَهُ وَبَرَكَتَهُ وَهُدَاهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِيهِ وَشَرِّ مَا بَعْدَهُ", translation: "O Allah, I ask You for the goodness of this day, its victory, its light, its blessings and its guidance, and I seek refuge in You from the evil that is in it and the evil that comes after it.", count: 1, source: "رواه أبو داود" },
    ],
  },
  {
    id: "morning",
    name: "Morning Azkar",
    nameAr: "أذكار الصباح",
    sectionId: "daily",
    items: [
      { id: "m1", text: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ", translation: "We have entered a new morning and all dominion belongs to Allah. Praise is to Allah. None has the right to be worshipped but Allah alone, with no partner. His is the dominion and His is the praise, and He is Able to do all things.", count: 1 },
      { id: "m2", text: "اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ", translation: "O Allah, by You we enter the morning, by You we enter the evening, by You we live, by You we die, and to You is the resurrection.", count: 1 },
      { id: "m3", text: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ", translation: "O Allah, You are my Lord. There is no god but You. You created me and I am Your servant, and I abide to Your covenant and promise as best I can. I seek refuge in You from the evil of what I have done. I acknowledge Your blessing upon me, and I acknowledge my sin, so forgive me, for none forgives sins but You. (Sayyid al-Istighfar)", count: 1, source: "رواه البخاري" },
      { id: "m4", text: "اللَّهُمَّ إِنِّي أَصْبَحْتُ أُشْهِدُكَ وَأُشْهِدُ حَمَلَةَ عَرْشِكَ وَمَلَائِكَتَكَ وَجَمِيعَ خَلْقِكَ أَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلَّا أَنْتَ وَحْدَكَ لَا شَرِيكَ لَكَ وَأَنَّ مُحَمَّدًا عَبْدُكَ وَرَسُولُكَ", translation: "O Allah, I call You to witness, and I call the bearers of Your Throne, Your angels, and all of Your creation to witness that You are Allah, there is no god but You alone, with no partner, and that Muhammad is Your servant and Messenger.", count: 4, source: "رواه أبو داود" },
      { id: "m5", text: "اللَّهُمَّ مَا أَصْبَحَ بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ، فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ", translation: "O Allah, whatever blessing I or any of Your creation have received this morning is from You alone, with no partner. So for You is all praise and for You is all thanks.", count: 1, source: "رواه أبو داود" },
      { id: "m6", text: "اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَهَ إِلَّا أَنْتَ", translation: "O Allah, grant me health in my body. O Allah, grant me health in my hearing. O Allah, grant me health in my sight. None has the right to be worshipped but You.", count: 3, source: "رواه أبو داود" },
      { id: "m7", text: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ وَالْفَقْرِ، وَأَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ، لَا إِلَهَ إِلَّا أَنْتَ", translation: "O Allah, I seek refuge in You from disbelief and poverty, and I seek refuge in You from the punishment of the grave. None has the right to be worshipped but You.", count: 3, source: "رواه أبو داود" },
      { id: "m8", text: "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي دِينِي وَدُنْيَايَ وَأَهْلِي وَمَالِي", translation: "O Allah, I ask You for pardon and well-being in this life and the next. O Allah, I ask You for pardon and well-being in my religious and worldly affairs, my family and my wealth.", count: 1, source: "رواه أبو داود" },
      { id: "m9", text: "اللَّهُمَّ اسْتُرْ عَوْرَاتِي وَآمِنْ رَوْعَاتِي، اللَّهُمَّ احْفَظْنِي مِنْ بَيْنِ يَدَيَّ وَمِنْ خَلْفِي وَعَنْ يَمِينِي وَعَنْ شِمَالِي وَمِنْ فَوْقِي، وَأَعُوذُ بِعَظَمَتِكَ أَنْ أُغْتَالَ مِنْ تَحْتِي", translation: "O Allah, conceal my faults and calm my fears. O Allah, guard me from before me and behind me, from my right and my left, and from above me. I seek refuge in Your greatness from being swallowed from below me.", count: 1, source: "رواه أبو داود" },
      { id: "m10", text: "اللَّهُمَّ عَالِمَ الْغَيْبِ وَالشَّهَادَةِ، فَاطِرَ السَّمَوَاتِ وَالْأَرْضِ، رَبَّ كُلِّ شَيْءٍ وَمَلِيكَهُ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا أَنْتَ، أَعُوذُ بِكَ مِنْ شَرِّ نَفْسِي وَمِنْ شَرِّ الشَّيْطَانِ وَشِرْكِهِ", translation: "O Allah, Knower of the unseen and the seen, Creator of the heavens and the earth, Lord and Sovereign of all things, I bear witness that none has the right to be worshipped but You. I seek refuge in You from the evil of my own soul and from the evil and polytheism of Satan.", count: 1, source: "رواه أبو داود" },
      { id: "m11", text: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ", translation: "In the Name of Allah, with whose Name nothing can cause harm on earth or in heaven, and He is the All-Hearing, the All-Knowing.", count: 3, source: "رواه أبو داود والترمذي" },
      { id: "m12", text: "رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا", translation: "I am pleased with Allah as my Lord, with Islam as my religion, and with Muhammad (peace be upon him) as my Prophet.", count: 3, source: "رواه أحمد" },
      { id: "m13", text: "يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ", translation: "O Ever-Living, O Sustainer of existence, by Your mercy I seek help. Set right all my affairs, and do not leave me to myself even for the blink of an eye.", count: 1, source: "رواه الحاكم" },
      { id: "m14", text: "أَصْبَحْنَا عَلَى فِطْرَةِ الْإِسْلَامِ، وَعَلَى كَلِمَةِ الْإِخْلَاصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ، وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ حَنِيفًا مُسْلِمًا وَمَا كَانَ مِنَ الْمُشْرِكِينَ", translation: "We have entered the morning upon the natural religion of Islam, upon the word of sincerity, upon the religion of our Prophet Muhammad (peace be upon him), and upon the way of our father Ibrahim, who was upright and Muslim. He was not of the polytheists.", count: 1, source: "رواه أحمد" },
      { id: "m15", text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ", translation: "Glory is to Allah and praise is to Him.", count: 100, source: "رواه البخاري ومسلم" },
      { id: "m16", text: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ", translation: "None has the right to be worshipped but Allah alone, with no partner. His is the dominion and His is the praise, and He is Able to do all things.", count: 10, source: "رواه البخاري" },
      { id: "m17", text: "حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ", translation: "Allah is sufficient for me. None has the right to be worshipped but Him. Upon Him I rely and He is Lord of the Majestic Throne.", count: 7, source: "رواه أبو داود" },
      { id: "m18", text: "اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا", translation: "O Allah, I ask You for beneficial knowledge, pure provision, and accepted deeds.", count: 1, source: "رواه ابن ماجه" },
    ],
  },
  {
    id: "evening",
    name: "Evening Azkar",
    nameAr: "أذكار المساء",
    sectionId: "daily",
    items: [
      { id: "e1", text: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ", translation: "We have entered the evening and with it all dominion belongs to Allah. Praise is to Allah. None has the right to be worshipped but Allah alone, with no partner.", count: 1 },
      { id: "e2", text: "اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ", translation: "O Allah, by You we enter the evening, by You we enter the morning, by You we live, by You we die, and to You is the final return.", count: 1 },
      { id: "e3", text: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ", translation: "O Allah, You are my Lord. There is no god but You. You created me and I am Your servant, and I abide to Your covenant and promise as best I can. I seek refuge in You from the evil of what I have done. I acknowledge Your blessing upon me, and I acknowledge my sin, so forgive me, for none forgives sins but You. (Sayyid al-Istighfar — Evening)", count: 1, source: "رواه البخاري" },
      { id: "e4", text: "اللَّهُمَّ إِنِّي أَمْسَيْتُ أُشْهِدُكَ وَأُشْهِدُ حَمَلَةَ عَرْشِكَ وَمَلَائِكَتَكَ وَجَمِيعَ خَلْقِكَ أَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلَّا أَنْتَ وَحْدَكَ لَا شَرِيكَ لَكَ وَأَنَّ مُحَمَّدًا عَبْدُكَ وَرَسُولُكَ", translation: "O Allah, I call You to witness, and I call the bearers of Your Throne, Your angels, and all of Your creation to witness that You are Allah, there is no god but You alone, with no partner, and that Muhammad is Your servant and Messenger.", count: 4, source: "رواه أبو داود" },
      { id: "e5", text: "اللَّهُمَّ مَا أَمْسَى بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ، فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ", translation: "O Allah, whatever blessing I or any of Your creation have received this evening is from You alone, with no partner. So for You is all praise and for You is all thanks.", count: 1, source: "رواه أبو داود" },
      { id: "e6", text: "اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَهَ إِلَّا أَنْتَ", translation: "O Allah, grant me health in my body. O Allah, grant me health in my hearing. O Allah, grant me health in my sight. None has the right to be worshipped but You.", count: 3, source: "رواه أبو داود" },
      { id: "e7", text: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ وَالْفَقْرِ، وَأَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ، لَا إِلَهَ إِلَّا أَنْتَ", translation: "O Allah, I seek refuge in You from disbelief and poverty, and I seek refuge in You from the punishment of the grave. None has the right to be worshipped but You.", count: 3, source: "رواه أبو داود" },
      { id: "e8", text: "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ", translation: "O Allah, I ask You for pardon and well-being in this life and the next.", count: 3 },
      { id: "e9", text: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ", translation: "I seek refuge in the perfect words of Allah from the evil of what He has created.", count: 3, source: "رواه مسلم" },
      { id: "e10", text: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ", translation: "In the Name of Allah, with whose Name nothing can cause harm on earth or in heaven, and He is the All-Hearing, the All-Knowing.", count: 3, source: "رواه أبو داود والترمذي" },
      { id: "e11", text: "رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا", translation: "I am pleased with Allah as my Lord, with Islam as my religion, and with Muhammad (peace be upon him) as my Prophet.", count: 3, source: "رواه أحمد" },
      { id: "e12", text: "يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ", translation: "O Ever-Living, O Sustainer of existence, by Your mercy I seek help. Set right all my affairs, and do not leave me to myself even for the blink of an eye.", count: 1, source: "رواه الحاكم" },
      { id: "e13", text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ", translation: "Glory is to Allah and praise is to Him.", count: 100, source: "رواه البخاري ومسلم" },
      { id: "e14", text: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ", translation: "None has the right to be worshipped but Allah alone, with no partner. His is the dominion and His is the praise, and He is Able to do all things.", count: 10, source: "رواه البخاري" },
      { id: "e15", text: "حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ", translation: "Allah is sufficient for me. None has the right to be worshipped but Him. Upon Him I rely and He is Lord of the Majestic Throne.", count: 7, source: "رواه أبو داود" },
      { id: "e16", text: "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ", translation: "O Allah, send blessings and peace upon our Prophet Muhammad.", count: 10, source: "رواه الطبراني" },
    ],
  },
  {
    id: "sleep",
    name: "Before Sleep",
    nameAr: "أذكار النوم",
    sectionId: "daily",
    items: [
      { id: "s1", text: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا", translation: "In Your name, O Allah, I die and I live.", count: 1, source: "رواه البخاري" },
      { id: "s2", text: "اللَّهُمَّ أَسْلَمْتُ نَفْسِي إِلَيْكَ، وَفَوَّضْتُ أَمْرِي إِلَيْكَ، وَوَجَّهْتُ وَجْهِي إِلَيْكَ، وَأَلْجَأْتُ ظَهْرِي إِلَيْكَ، رَغْبَةً وَرَهْبَةً إِلَيْكَ، لَا مَلْجَأَ وَلَا مَنْجَا مِنْكَ إِلَّا إِلَيْكَ، آمَنْتُ بِكِتَابِكَ الَّذِي أَنْزَلْتَ، وَبِنَبِيِّكَ الَّذِي أَرْسَلْتَ", translation: "O Allah, I have submitted my soul to You, entrusted my affairs to You, turned my face to You, and leaned my back to You, in hope and in fear of You. There is no refuge or escape from You except to You. I have believed in Your Book that You revealed and in Your Prophet whom You sent.", count: 1, source: "رواه البخاري ومسلم" },
      { id: "s3", text: "بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي وَبِكَ أَرْفَعُهُ، فَإِنْ أَمْسَكْتَ نَفْسِي فَارْحَمْهَا، وَإِنْ أَرْسَلْتَهَا فَاحْفَظْهَا بِمَا تَحْفَظُ بِهِ عِبَادَكَ الصَّالِحِينَ", translation: "In Your name my Lord, I lay down my side and by You I raise it. If You take my soul, have mercy on it, and if You release it, protect it as You protect Your righteous servants.", count: 1, source: "رواه البخاري ومسلم" },
      { id: "s4", text: "اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ", translation: "O Allah, protect me from Your punishment on the Day You resurrect Your servants.", count: 3, source: "رواه أبو داود" },
      { id: "s5", text: "سُبْحَانَ اللَّهِ", translation: "Glory is to Allah.", count: 33, source: "رواه البخاري ومسلم" },
      { id: "s6", text: "الْحَمْدُ لِلَّهِ", translation: "Praise is to Allah.", count: 33, source: "رواه البخاري ومسلم" },
      { id: "s7", text: "اللَّهُ أَكْبَرُ", translation: "Allah is the Greatest.", count: 34, source: "رواه البخاري ومسلم" },
      { id: "s8", text: "اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ...", translation: "Ayat Al-Kursi — Allah, there is no god but He, the Ever-Living, the Sustainer of existence. Neither drowsiness nor sleep overtakes Him... (Surah Al-Baqarah 2:255)", count: 1, source: "رواه البخاري" },
      { id: "s9", text: "قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ", translation: "Surah Al-Ikhlas — Say: He is Allah, the One. Allah, the Eternal Refuge. He neither begets nor is born, nor is there to Him any equivalent. (Recite also Al-Falaq and An-Nas)", count: 3, source: "رواه البخاري" },
      { id: "s10", text: "اللَّهُمَّ إِنَّكَ خَلَقْتَ نَفْسِي وَأَنْتَ تَوَفَّاهَا، لَكَ مَمَاتُهَا وَمَحْيَاهَا، إِنْ أَحْيَيْتَهَا فَاحْفَظْهَا، وَإِنْ أَمَتَّهَا فَاغْفِرْ لَهَا. اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَافِيَةَ", translation: "O Allah, You created my soul and You will take it in death. Yours is its death and its life. If You keep it alive, protect it, and if You cause it to die, forgive it. O Allah, I ask You for well-being.", count: 1, source: "رواه مسلم" },
    ],
  },
  {
    id: "clothing",
    name: "Wearing Clothes",
    nameAr: "أذكار اللباس",
    sectionId: "daily",
    items: [
      { id: "cl1", text: "بِسْمِ اللَّهِ", translation: "In the Name of Allah. (When putting on clothes)", count: 1 },
      { id: "cl2", text: "الْحَمْدُ لِلَّهِ الَّذِي كَسَانِي هَذَا الثَّوْبَ وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ", translation: "Praise is to Allah who clothed me with this garment and provided it for me, with no power or strength from myself.", count: 1, source: "رواه أبو داود والترمذي" },
      { id: "cl3", text: "اللَّهُمَّ لَكَ الْحَمْدُ أَنْتَ كَسَوْتَنِيهِ، أَسْأَلُكَ مِنْ خَيْرِهِ وَخَيْرِ مَا صُنِعَ لَهُ، وَأَعُوذُ بِكَ مِنْ شَرِّهِ وَشَرِّ مَا صُنِعَ لَهُ", translation: "O Allah, for You is all praise. You have clothed me with it. I ask You for its goodness and the goodness for which it was made, and I seek refuge in You from its evil and the evil for which it was made.", count: 1, source: "رواه أبو داود" },
    ],
  },
  {
    id: "home",
    name: "Entering the Home",
    nameAr: "دعاء دخول المنزل",
    sectionId: "daily",
    items: [
      { id: "hm1", text: "بِسْمِ اللَّهِ وَلَجْنَا، وَبِسْمِ اللَّهِ خَرَجْنَا، وَعَلَى اللَّهِ رَبِّنَا تَوَكَّلْنَا", translation: "In the Name of Allah we enter, in the Name of Allah we leave, and upon our Lord Allah we rely.", count: 1, source: "رواه أبو داود" },
    ],
  },
  {
    id: "leaving-home",
    name: "Leaving the Home",
    nameAr: "دعاء الخروج من المنزل",
    sectionId: "daily",
    items: [
      { id: "lh1", text: "بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ، لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ", translation: "In the Name of Allah, I place my trust in Allah. There is no might and no power except with Allah.", count: 1, source: "رواه أبو داود والترمذي" },
    ],
  },
  {
    id: "returning-home",
    name: "Returning Home",
    nameAr: "دعاء الرجوع إلى المنزل",
    sectionId: "daily",
    items: [
      { id: "rh1", text: "تَوْبًا تَوْبًا لِرَبِّنَا، أَوْبًا أَوْبًا لَا يُغَادِرُ عَلَيْنَا ذَنْبًا", translation: "We repent, we repent to our Lord. We return to Him again and again — let Him not leave any sin upon us.", count: 1, source: "رواه مسلم" },
    ],
  },
  {
    id: "toilet",
    name: "Entering the Toilet",
    nameAr: "أذكار دخول الخلاء",
    sectionId: "daily",
    items: [
      { id: "to1", text: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ", translation: "O Allah, I seek refuge in You from the male and female devils.", count: 1, source: "رواه البخاري ومسلم" },
      { id: "to2", text: "غُفْرَانَكَ", translation: "I ask for Your forgiveness. (When leaving the toilet)", count: 1, source: "رواه أبو داود والترمذي" },
    ],
  },
  {
    id: "ablution",
    name: "Ablution (Wudu)",
    nameAr: "أذكار الوضوء",
    sectionId: "daily",
    items: [
      { id: "ab1", text: "بِسْمِ اللَّهِ", translation: "In the Name of Allah. (Before starting wudu)", count: 1 },
      { id: "ab2", text: "أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ، اللَّهُمَّ اجْعَلْنِي مِنَ التَّوَّابِينَ وَاجْعَلْنِي مِنَ الْمُتَطَهِّرِينَ", translation: "I bear witness that none has the right to be worshipped but Allah alone, with no partner, and I bear witness that Muhammad is His slave and Messenger. O Allah, make me of those who repent and make me of those who purify themselves. (After wudu)", count: 1, source: "رواه مسلم" },
      { id: "ab3", text: "سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا أَنْتَ، أَسْتَغْفِرُكَ وَأَتُوبُ إِلَيْكَ", translation: "Glory is to You O Allah and praise. I bear witness that none has the right to be worshipped but You. I seek Your forgiveness and repent to You. (After wudu)", count: 1, source: "رواه النسائي" },
    ],
  },
  {
    id: "mirror",
    name: "Looking in the Mirror",
    nameAr: "دعاء النظر في المرآة",
    sectionId: "daily",
    items: [
      { id: "mr1", text: "اللَّهُمَّ كَمَا حَسَّنْتَ خَلْقِي فَحَسِّنْ خُلُقِي", translation: "O Allah, just as You have made my external features beautiful, make my character beautiful as well.", count: 1, source: "رواه أحمد" },
    ],
  },
  {
    id: "adhan",
    name: "Responding to Adhan",
    nameAr: "أذكار الأذان",
    sectionId: "prayer",
    items: [
      { id: "az1", text: "وَأَنَا أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ وَأَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ، رَضِيتُ بِاللَّهِ رَبًّا وَبِمُحَمَّدٍ رَسُولًا وَبِالْإِسْلَامِ دِينًا", translation: "I also bear witness that none has the right to be worshipped but Allah alone, with no partner, and that Muhammad is His slave and Messenger. I am pleased with Allah as my Lord, Muhammad as my Messenger, and Islam as my religion. (Repeat after each sentence of the adhan)", count: 1, source: "رواه مسلم" },
      { id: "az2", text: "اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ وَالصَّلَاةِ الْقَائِمَةِ آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ وَابْعَثْهُ مَقَامًا مَحْمُودًا الَّذِي وَعَدْتَهُ", translation: "O Allah, Lord of this perfect call and established prayer, grant Muhammad the intercession and the privilege, and resurrect him to the praised station that You have promised him.", count: 1, source: "رواه البخاري" },
    ],
  },
  {
    id: "after-adhan",
    name: "Between Adhan and Iqama",
    nameAr: "الدعاء بين الأذان والإقامة",
    sectionId: "prayer",
    items: [
      { id: "aa1", text: "الدُّعَاءُ لَا يُرَدُّ بَيْنَ الْأَذَانِ وَالْإِقَامَةِ فَادْعُوا", translation: "Supplication between the adhan and the iqama is not rejected, so make dua. (This time is recommended for any personal supplication)", count: 1, source: "رواه أبو داود" },
    ],
  },
  {
    id: "going-mosque",
    name: "Going to the Mosque",
    nameAr: "دعاء الذهاب إلى المسجد",
    sectionId: "prayer",
    items: [
      { id: "gm1", text: "اللَّهُمَّ اجْعَلْ فِي قَلْبِي نُورًا، وَفِي لِسَانِي نُورًا، وَفِي سَمْعِي نُورًا، وَفِي بَصَرِي نُورًا، وَمِنْ فَوْقِي نُورًا، وَمِنْ تَحْتِي نُورًا، وَعَنْ يَمِينِي نُورًا، وَعَنْ شِمَالِي نُورًا، وَمِنْ أَمَامِي نُورًا، وَمِنْ خَلْفِي نُورًا، وَاجْعَلْ لِي نُورًا", translation: "O Allah, place light in my heart, light in my tongue, light in my hearing, light in my sight, light above me, light below me, light to my right, light to my left, light ahead of me, light behind me, and grant me light.", count: 1, source: "رواه البخاري ومسلم" },
    ],
  },
  {
    id: "entering-mosque",
    name: "Entering the Mosque",
    nameAr: "دعاء دخول المسجد",
    sectionId: "prayer",
    items: [
      { id: "em1", text: "أَعُوذُ بِاللَّهِ الْعَظِيمِ وَبِوَجْهِهِ الْكَرِيمِ وَسُلْطَانِهِ الْقَدِيمِ مِنَ الشَّيْطَانِ الرَّجِيمِ", translation: "I seek refuge in Allah the Almighty, in His noble face, and in His eternal power, from Satan the accursed.", count: 1, source: "رواه أبو داود" },
      { id: "em2", text: "بِسْمِ اللَّهِ وَالصَّلَاةُ وَالسَّلَامُ عَلَى رَسُولِ اللَّهِ، اللَّهُمَّ اغْفِرْ لِي ذُنُوبِي وَافْتَحْ لِي أَبْوَابَ رَحْمَتِكَ", translation: "In the Name of Allah, and peace and blessings be upon the Messenger of Allah. O Allah, forgive me my sins and open for me the gates of Your mercy.", count: 1, source: "رواه ابن ماجه" },
    ],
  },
  {
    id: "leaving-mosque",
    name: "Leaving the Mosque",
    nameAr: "دعاء الخروج من المسجد",
    sectionId: "prayer",
    items: [
      { id: "lm1", text: "بِسْمِ اللَّهِ وَالصَّلَاةُ وَالسَّلَامُ عَلَى رَسُولِ اللَّهِ، اللَّهُمَّ اغْفِرْ لِي ذُنُوبِي وَافْتَحْ لِي أَبْوَابَ فَضْلِكَ", translation: "In the Name of Allah, and peace and blessings be upon the Messenger of Allah. O Allah, forgive me my sins and open for me the gates of Your bounty.", count: 1, source: "رواه ابن ماجه" },
    ],
  },
  {
    id: "opening-prayer",
    name: "Opening the Prayer",
    nameAr: "دعاء الاستفتاح",
    sectionId: "prayer",
    items: [
      { id: "op1", text: "سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، وَتَبَارَكَ اسْمُكَ، وَتَعَالَى جَدُّكَ، وَلَا إِلَهَ غَيْرُكَ", translation: "Glory is to You O Allah, and praise. Blessed is Your name and exalted is Your majesty. None has the right to be worshipped but You.", count: 1, source: "رواه أبو داود" },
      { id: "op2", text: "اللَّهُمَّ بَاعِدْ بَيْنِي وَبَيْنَ خَطَايَايَ كَمَا بَاعَدْتَ بَيْنَ الْمَشْرِقِ وَالْمَغْرِبِ، اللَّهُمَّ نَقِّنِي مِنَ الْخَطَايَا كَمَا يُنَقَّى الثَّوْبُ الأَبْيَضُ مِنَ الدَّنَسِ، اللَّهُمَّ اغْسِلْ خَطَايَايَ بِالْمَاءِ وَالثَّلْجِ وَالْبَرَدِ", translation: "O Allah, distance me from my sins as You have distanced the East from the West. O Allah, cleanse me of sins as white cloth is cleansed of filth. O Allah, wash away my sins with water, snow, and hail.", count: 1, source: "رواه البخاري ومسلم" },
    ],
  },
  {
    id: "ruku",
    name: "Ruku (Bowing)",
    nameAr: "أذكار الركوع",
    sectionId: "prayer",
    items: [
      { id: "rk1", text: "سُبْحَانَ رَبِّيَ الْعَظِيمِ", translation: "Glory is to my Lord, the Most Great.", count: 3, source: "رواه أبو داود" },
      { id: "rk2", text: "سُبْحَانَكَ اللَّهُمَّ رَبَّنَا وَبِحَمْدِكَ، اللَّهُمَّ اغْفِرْ لِي", translation: "Glory is to You O Allah, our Lord, and praise. O Allah, forgive me.", count: 1, source: "رواه البخاري ومسلم" },
      { id: "rk3", text: "سُبُّوحٌ قُدُّوسٌ رَبُّ الْمَلَائِكَةِ وَالرُّوحِ", translation: "Perfect, Holy, Lord of the angels and the Spirit.", count: 3, source: "رواه مسلم" },
    ],
  },
  {
    id: "sujood",
    name: "Sujood (Prostration)",
    nameAr: "أذكار السجود",
    sectionId: "prayer",
    items: [
      { id: "sj1", text: "سُبْحَانَ رَبِّيَ الأَعْلَى", translation: "Glory is to my Lord, the Most High.", count: 3, source: "رواه أبو داود" },
      { id: "sj2", text: "سُبْحَانَكَ اللَّهُمَّ رَبَّنَا وَبِحَمْدِكَ، اللَّهُمَّ اغْفِرْ لِي", translation: "Glory is to You O Allah, our Lord, and praise. O Allah, forgive me.", count: 1, source: "رواه البخاري ومسلم" },
      { id: "sj3", text: "اللَّهُمَّ اغْفِرْ لِي ذَنْبِي كُلَّهُ، دِقَّهُ وَجِلَّهُ، وَأَوَّلَهُ وَآخِرَهُ، وَعَلَانِيَتَهُ وَسِرَّهُ", translation: "O Allah, forgive me all of my sins, the small and the great, the first and the last, the open and the secret.", count: 1, source: "رواه مسلم" },
    ],
  },
  {
    id: "tashahhud",
    name: "Tashahhud",
    nameAr: "التشهد",
    sectionId: "prayer",
    items: [
      { id: "ts1", text: "التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَى عِبَادِ اللَّهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ", translation: "All greetings are for Allah, and all prayers and all good things. Peace be upon you, O Prophet, and the mercy of Allah and His blessings. Peace be upon us and upon the righteous servants of Allah. I bear witness that none has the right to be worshipped but Allah, and I bear witness that Muhammad is His slave and Messenger.", count: 1, source: "رواه البخاري ومسلم" },
      { id: "ts2", text: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ", translation: "O Allah, send prayers upon Muhammad and the family of Muhammad, just as You sent prayers upon Ibrahim and the family of Ibrahim. Verily, You are the Praiseworthy, the Majestic.", count: 1, source: "رواه البخاري ومسلم" },
      { id: "ts3", text: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ عَذَابِ جَهَنَّمَ وَمِنْ عَذَابِ الْقَبْرِ وَمِنْ فِتْنَةِ الْمَحْيَا وَالْمَمَاتِ وَمِنْ شَرِّ فِتْنَةِ الْمَسِيحِ الدَّجَّالِ", translation: "O Allah, I seek refuge in You from the punishment of Hellfire, the punishment of the grave, the trials of life and death, and the evil of the trial of the False Messiah.", count: 1, source: "رواه البخاري ومسلم" },
    ],
  },
  {
    id: "after-prayer",
    name: "After Prayer",
    nameAr: "أذكار بعد الصلاة",
    sectionId: "prayer",
    items: [
      { id: "p1", text: "أَسْتَغْفِرُ اللَّهَ", translation: "I seek Allah's forgiveness.", count: 3, source: "رواه مسلم" },
      { id: "p2", text: "اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ", translation: "O Allah, You are Peace and from You comes peace. Blessed are You, O Possessor of majesty and honor.", count: 1, source: "رواه مسلم" },
      { id: "p3", text: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، اللَّهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ وَلَا مُعْطِيَ لِمَا مَنَعْتَ وَلَا يَنْفَعُ ذَا الْجَدِّ مِنْكَ الْجَدُّ", translation: "None has the right to be worshipped but Allah alone, with no partner. His is the dominion and His is the praise and He is over all things omnipotent. O Allah, none can withhold what You have given, and none can give what You have withheld, and the wealth of the wealthy cannot avail against You.", count: 1, source: "رواه البخاري ومسلم" },
      { id: "p4", text: "سُبْحَانَ اللَّهِ", translation: "Glory is to Allah.", count: 33, source: "رواه مسلم" },
      { id: "p5", text: "الْحَمْدُ لِلَّهِ", translation: "Praise is to Allah.", count: 33, source: "رواه مسلم" },
      { id: "p6", text: "اللَّهُ أَكْبَرُ", translation: "Allah is the Greatest.", count: 34, source: "رواه مسلم" },
      { id: "p7", text: "اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ...", translation: "Ayat Al-Kursi — Allah, there is no god but He, the Ever-Living, the Sustainer of existence... (Recite Surah Al-Baqarah 2:255)", count: 1, source: "رواه النسائي" },
      { id: "p8", text: "اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا طَيِّبًا وَعَمَلًا مُتَقَبَّلًا", translation: "O Allah, I ask You for beneficial knowledge, pure provision, and accepted deeds. (After Fajr prayer)", count: 1, source: "رواه ابن ماجه" },
    ],
  },
  {
    id: "witr-qunut",
    name: "Witr & Qunut",
    nameAr: "دعاء القنوت والوتر",
    sectionId: "prayer",
    items: [
      { id: "wq1", text: "اللَّهُمَّ اهْدِنِي فِيمَنْ هَدَيْتَ، وَعَافِنِي فِيمَنْ عَافَيْتَ، وَتَوَلَّنِي فِيمَنْ تَوَلَّيْتَ، وَبَارِكْ لِي فِيمَا أَعْطَيْتَ، وَقِنِي شَرَّ مَا قَضَيْتَ، فَإِنَّكَ تَقْضِي وَلَا يُقْضَى عَلَيْكَ، وَإِنَّهُ لَا يَذِلُّ مَنْ وَالَيْتَ، تَبَارَكْتَ رَبَّنَا وَتَعَالَيْتَ", translation: "O Allah, guide me among those whom You have guided, pardon me among those whom You have pardoned, befriend me among those whom You have befriended, bless me in what You have given, and save me from the evil of what You have decreed. Indeed You decree and none can decree against You. Verily, the one whom You support cannot be disgraced. Blessed and Exalted are You, our Lord.", count: 1, source: "رواه أبو داود والترمذي" },
    ],
  },
  {
    id: "istikharah",
    name: "Istikhara",
    nameAr: "دعاء الاستخارة",
    sectionId: "prayer",
    items: [
      { id: "ist1", text: "اللَّهُمَّ إِنِّي أَسْتَخِيرُكَ بِعِلْمِكَ، وَأَسْتَقْدِرُكَ بِقُدْرَتِكَ، وَأَسْأَلُكَ مِنْ فَضْلِكَ الْعَظِيمِ، فَإِنَّكَ تَقْدِرُ وَلَا أَقْدِرُ، وَتَعْلَمُ وَلَا أَعْلَمُ، وَأَنْتَ عَلَّامُ الْغُيُوبِ. اللَّهُمَّ إِنْ كُنْتَ تَعْلَمُ أَنَّ هَذَا الأَمْرَ خَيْرٌ لِي فِي دِينِي وَمَعَاشِي وَعَاقِبَةِ أَمْرِي فَاقْدُرْهُ لِي وَيَسِّرْهُ لِي ثُمَّ بَارِكْ لِي فِيهِ، وَإِنْ كُنْتَ تَعْلَمُ أَنَّ هَذَا الأَمْرَ شَرٌّ لِي فِي دِينِي وَمَعَاشِي وَعَاقِبَةِ أَمْرِي فَاصْرِفْهُ عَنِّي وَاصْرِفْنِي عَنْهُ وَاقْدُرْ لِي الْخَيْرَ حَيْثُ كَانَ ثُمَّ أَرْضِنِي بِهِ", translation: "O Allah, I seek Your guidance by virtue of Your knowledge, and I seek ability by virtue of Your power, and I ask You of Your great bounty. You have power and I have none; You know and I do not know; You are the Knower of hidden things. O Allah, if You know that this matter [name it] is good for me in my religion, my livelihood and my affairs, then ordain it for me, make it easy for me and bless it for me. And if You know that this matter is bad for me in my religion, my livelihood and my affairs, then turn it away from me and turn me away from it, and ordain for me the good wherever it may be and make me pleased with it.", count: 1, source: "رواه البخاري" },
    ],
  },
  {
    id: "friday",
    name: "Friday Remembrances",
    nameAr: "أذكار وأعمال يوم الجمعة",
    sectionId: "prayer",
    items: [
      { id: "fr1", text: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ", translation: "O Allah, send blessings upon Muhammad and upon the family of Muhammad. (Increase salawat on Fridays)", count: 80, source: "رواه البيهقي" },
      { id: "fr2", text: "قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ...", translation: "Recite Surah Al-Kahf on Friday — reading it brings a light between two Fridays.", count: 1, source: "رواه الحاكم" },
    ],
  },
  {
    id: "before-eating",
    name: "Before Eating",
    nameAr: "أدعية قبل الطعام",
    sectionId: "eating",
    items: [
      { id: "be1", text: "بِسْمِ اللَّهِ", translation: "In the Name of Allah. (Say before eating)", count: 1, source: "رواه أبو داود والترمذي" },
      { id: "be2", text: "بِسْمِ اللَّهِ فِي أَوَّلِهِ وَآخِرِهِ", translation: "In the Name of Allah at its beginning and at its end. (If you forgot to say bismillah at the start)", count: 1, source: "رواه أبو داود والترمذي" },
    ],
  },
  {
    id: "after-eating",
    name: "After Eating",
    nameAr: "أدعية بعد الطعام",
    sectionId: "eating",
    items: [
      { id: "ae1", text: "الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ", translation: "Praise is to Allah who fed me this and provided it for me without any power or strength from me.", count: 1, source: "رواه أبو داود والترمذي" },
      { id: "ae2", text: "الْحَمْدُ لِلَّهِ حَمْدًا كَثِيرًا طَيِّبًا مُبَارَكًا فِيهِ غَيْرَ مَكْفِيٍّ وَلَا مُوَدَّعٍ وَلَا مُسْتَغْنًى عَنْهُ رَبَّنَا", translation: "Praise be to Allah, abundant, good, and blessed praise. Our Lord, not sufficient, nor bidden farewell, nor left without need.", count: 1, source: "رواه البخاري" },
    ],
  },
  {
    id: "when-fasting",
    name: "While Fasting",
    nameAr: "أدعية الصيام",
    sectionId: "eating",
    items: [
      { id: "wf1", text: "إِنِّي صَائِمٌ", translation: "I am fasting. (Say this if someone insults or provokes you while you are fasting)", count: 1, source: "رواه البخاري ومسلم" },
    ],
  },
  {
    id: "breaking-fast",
    name: "Breaking the Fast",
    nameAr: "دعاء الإفطار",
    sectionId: "eating",
    items: [
      { id: "bf1", text: "ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الأَجْرُ إِنْ شَاءَ اللَّهُ", translation: "The thirst is gone, the veins are moistened, and the reward is confirmed, if Allah wills.", count: 1, source: "رواه أبو داود" },
      { id: "bf2", text: "اللَّهُمَّ إِنِّي أَسْأَلُكَ بِرَحْمَتِكَ الَّتِي وَسِعَتْ كُلَّ شَيْءٍ أَنْ تَغْفِرَ لِي", translation: "O Allah, I ask You by Your mercy which encompasses all things, that You forgive me.", count: 1, source: "رواه ابن ماجه" },
    ],
  },
  {
    id: "guest-food",
    name: "Praying for the Host",
    nameAr: "دعاء الضيف لصاحب الطعام",
    sectionId: "eating",
    items: [
      { id: "gf1", text: "اللَّهُمَّ بَارِكْ لَهُمْ فِيمَا رَزَقْتَهُمْ وَاغْفِرْ لَهُمْ وَارْحَمْهُمْ", translation: "O Allah, bless them in what You have provided them with, forgive them and have mercy on them.", count: 1, source: "رواه مسلم" },
    ],
  },
  {
    id: "drinking-milk",
    name: "After Drinking Milk",
    nameAr: "دعاء شرب اللبن",
    sectionId: "eating",
    items: [
      { id: "dm1", text: "اللَّهُمَّ بَارِكْ لَنَا فِيهِ وَزِدْنَا مِنْهُ", translation: "O Allah, bless us in it and give us more of it.", count: 1, source: "رواه أبو داود والترمذي" },
    ],
  },
  {
    id: "drinking-water",
    name: "Drinking Zamzam Water",
    nameAr: "دعاء شرب ماء زمزم",
    sectionId: "eating",
    items: [
      { id: "dw1", text: "اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا وَاسِعًا وَشِفَاءً مِنْ كُلِّ دَاءٍ", translation: "O Allah, I ask You for beneficial knowledge, abundant sustenance, and a cure from every ailment. (When drinking Zamzam)", count: 1, source: "رواه الحاكم" },
    ],
  },
  {
    id: "riding-vehicle",
    name: "Riding a Vehicle",
    nameAr: "دعاء ركوب الدابة والسيارة",
    sectionId: "travel",
    items: [
      { id: "rv1", text: "بِسْمِ اللَّهِ، الْحَمْدُ لِلَّهِ، سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ، الْحَمْدُ لِلَّهِ، الْحَمْدُ لِلَّهِ، الْحَمْدُ لِلَّهِ، اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، سُبْحَانَكَ اللَّهُمَّ إِنِّي ظَلَمْتُ نَفْسِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ", translation: "In the Name of Allah. Praise be to Allah. Glory be to Him who has subjected this to us, and we could never have done it by our own efforts. And verily, to our Lord we shall certainly return. Praise is to Allah, Praise is to Allah, Praise is to Allah, Allah is the Greatest, Allah is the Greatest, Allah is the Greatest. Glory is to You; indeed I have wronged myself, so forgive me, for none forgives sins except You.", count: 1, source: "رواه أبو داود والترمذي" },
    ],
  },
  {
    id: "travel-supplication",
    name: "Travel Supplication",
    nameAr: "دعاء السفر",
    sectionId: "travel",
    items: [
      { id: "ts4", text: "اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى، وَمِنَ الْعَمَلِ مَا تَرْضَى، اللَّهُمَّ هَوِّنْ عَلَيْنَا سَفَرَنَا هَذَا وَاطْوِ عَنَّا بُعْدَهُ، اللَّهُمَّ أَنْتَ الصَّاحِبُ فِي السَّفَرِ وَالْخَلِيفَةُ فِي الْأَهْلِ، اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ وَعْثَاءِ السَّفَرِ وَكَآبَةِ الْمَنْظَرِ وَسُوءِ الْمُنْقَلَبِ فِي الْمَالِ وَالْأَهْلِ وَالْوَلَدِ", translation: "O Allah, we ask You in this journey of ours for righteousness, piety and deeds that are pleasing to You. O Allah, make this journey easy for us and shorten its distance. O Allah, You are the Companion on the journey and the Guardian of the family. O Allah, I seek refuge in You from the hardship of traveling, from having a change of heart, and from a bad return in wealth, family and children.", count: 1, source: "رواه مسلم" },
    ],
  },
  {
    id: "entering-town",
    name: "Entering a Town",
    nameAr: "دعاء دخول البلد",
    sectionId: "travel",
    items: [
      { id: "et1", text: "اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَهَا وَخَيْرَ أَهْلِهَا وَخَيْرَ مَا فِيهَا، وَأَعُوذُ بِكَ مِنْ شَرِّهَا وَشَرِّ أَهْلِهَا وَشَرِّ مَا فِيهَا", translation: "O Allah, I ask You for the goodness of it, the goodness of its people and the goodness of what is in it, and I seek refuge in You from its evil, the evil of its people and the evil of what is in it.", count: 1, source: "رواه البخاري" },
    ],
  },
  {
    id: "entering-market",
    name: "Entering the Market",
    nameAr: "دعاء دخول السوق",
    sectionId: "travel",
    items: [
      { id: "em3", text: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ يُحْيِي وَيُمِيتُ وَهُوَ حَيٌّ لَا يَمُوتُ بِيَدِهِ الْخَيْرُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ", translation: "None has the right to be worshipped but Allah alone, with no partner. His is the dominion and His is the praise. He gives life and causes death, and He is ever-Living and will never die. In His hand is good and He is Able to do all things.", count: 1, source: "رواه الترمذي" },
    ],
  },
  {
    id: "returning-travel",
    name: "Returning from Travel",
    nameAr: "دعاء العودة من السفر",
    sectionId: "travel",
    items: [
      { id: "rt1", text: "آيِبُونَ تَائِبُونَ عَابِدُونَ لِرَبِّنَا حَامِدُونَ", translation: "We are returning, repenting, worshipping, and praising our Lord.", count: 1, source: "رواه البخاري ومسلم" },
    ],
  },
  {
    id: "hajj-umrah",
    name: "Hajj & Umrah",
    nameAr: "أذكار الحج والعمرة",
    sectionId: "travel",
    items: [
      { id: "hu1", text: "لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لَا شَرِيكَ لَكَ", translation: "Here I am O Allah, here I am. Here I am, You have no partner, here I am. Truly all praise, favor, and sovereignty is Yours. You have no partner.", count: 1, source: "رواه البخاري ومسلم" },
      { id: "hu2", text: "اللَّهُمَّ اجْعَلْهُ حَجًّا مَبْرُورًا وَذَنْبًا مَغْفُورًا وَسَعْيًا مَشْكُورًا", translation: "O Allah, make it an accepted Hajj, a forgiven sin and an appreciated effort.", count: 1 },
    ],
  },
  {
    id: "greeting",
    name: "Greetings",
    nameAr: "التحية والسلام",
    sectionId: "social",
    items: [
      { id: "gr1", text: "السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ", translation: "Peace be upon you and the mercy of Allah and His blessings.", count: 1 },
      { id: "gr2", text: "وَعَلَيْكُمُ السَّلَامُ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ", translation: "And upon you be peace and the mercy of Allah and His blessings. (Reply to salam)", count: 1 },
    ],
  },
  {
    id: "entering-house",
    name: "Entering a House",
    nameAr: "دعاء دخول البيت",
    sectionId: "social",
    items: [
      { id: "eh1", text: "اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ الْمَوْلَجِ وَخَيْرَ الْمَخْرَجِ، بِسْمِ اللَّهِ وَلَجْنَا وَبِسْمِ اللَّهِ خَرَجْنَا وَعَلَى اللَّهِ رَبِّنَا تَوَكَّلْنَا", translation: "O Allah, I ask You for the goodness of entering and the goodness of leaving. In the Name of Allah we enter, in the Name of Allah we leave, and upon our Lord Allah we rely.", count: 1, source: "رواه أبو داود" },
    ],
  },
  {
    id: "gatherings",
    name: "Gatherings",
    nameAr: "أذكار المجلس",
    sectionId: "social",
    items: [
      { id: "ga1", text: "سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا أَنْتَ، أَسْتَغْفِرُكَ وَأَتُوبُ إِلَيْكَ", translation: "Glory is to You O Allah and praise. I bear witness that none has the right to be worshipped but You. I seek Your forgiveness and repent to You. (Kaffaratul Majlis — expiation for the gathering)", count: 1, source: "رواه أبو داود والترمذي" },
      { id: "ga2", text: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ أَنْ أُشْرِكَ بِكَ وَأَنَا أَعْلَمُ، وَأَسْتَغْفِرُكَ لِمَا لَا أَعْلَمُ", translation: "O Allah, I seek refuge in You from knowingly associating partners with You, and I seek Your forgiveness for what I do not know.", count: 1, source: "رواه البخاري في الأدب المفرد" },
    ],
  },
  {
    id: "sneezing",
    name: "Sneezing",
    nameAr: "أذكار العطاس",
    sectionId: "social",
    items: [
      { id: "sn1", text: "الْحَمْدُ لِلَّهِ", translation: "Praise is to Allah. (When you sneeze)", count: 1, source: "رواه البخاري" },
      { id: "sn2", text: "يَرْحَمُكَ اللَّهُ", translation: "May Allah have mercy on you. (Reply when someone sneezes and says Alhamdulillah)", count: 1, source: "رواه البخاري" },
      { id: "sn3", text: "يَهْدِيكُمُ اللَّهُ وَيُصْلِحُ بَالَكُمْ", translation: "May Allah guide you and set your affairs right. (Said by the one who sneezed in reply to the well-wishing)", count: 1, source: "رواه البخاري" },
    ],
  },
  {
    id: "yawning",
    name: "Yawning",
    nameAr: "أذكار التثاؤب",
    sectionId: "social",
    items: [
      { id: "ya1", text: "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ", translation: "I seek refuge in Allah from Satan the accursed. (Suppress yawning if possible, then say this)", count: 1, source: "رواه البخاري ومسلم" },
    ],
  },
  {
    id: "anger",
    name: "When Feeling Angry",
    nameAr: "دعاء الغضب",
    sectionId: "social",
    items: [
      { id: "an1", text: "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ", translation: "I seek refuge in Allah from Satan the accursed.", count: 1, source: "رواه البخاري ومسلم" },
    ],
  },
  {
    id: "newborn",
    name: "Newborn",
    nameAr: "دعاء المولود",
    sectionId: "social",
    items: [
      { id: "nb1", text: "بَارَكَ اللَّهُ لَكَ فِي الْمَوْهُوبِ لَكَ، وَشَكَرْتَ الْوَاهِبَ، وَبَلَغَ أَشُدَّهُ، وَرُزِقْتَ بِرَّهُ", translation: "May Allah bless what has been given to you, may you give thanks to the Giver, may the child reach the age of maturity, and may you be granted its righteousness.", count: 1, source: "رواه البخاري في الأدب المفرد" },
    ],
  },
  {
    id: "marriage",
    name: "Marriage",
    nameAr: "دعاء الزواج",
    sectionId: "social",
    items: [
      { id: "ma1", text: "بَارَكَ اللَّهُ لَكَ وَبَارَكَ عَلَيْكَ وَجَمَعَ بَيْنَكُمَا فِي خَيْرٍ", translation: "May Allah bless you, and shower His blessings upon you, and join you together in goodness.", count: 1, source: "رواه أبو داود والترمذي" },
      { id: "ma2", text: "اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَهَا وَخَيْرَ مَا جَبَلْتَهَا عَلَيْهِ، وَأَعُوذُ بِكَ مِنْ شَرِّهَا وَشَرِّ مَا جَبَلْتَهَا عَلَيْهِ", translation: "O Allah, I ask You for the good in her and the good You have made her inclined towards, and I seek refuge in You from the evil in her and the evil You have made her inclined towards. (Dua for a new bride)", count: 1, source: "رواه أبو داود" },
    ],
  },
  {
    id: "congratulations",
    name: "Congratulations",
    nameAr: "التهنئة",
    sectionId: "social",
    items: [
      { id: "cg1", text: "بَارَكَ اللَّهُ لَكَ", translation: "May Allah bless you.", count: 1 },
      { id: "cg2", text: "مَا شَاءَ اللَّهُ لَا قُوَّةَ إِلَّا بِاللَّهِ", translation: "What Allah wills; there is no power except with Allah. (Said when seeing something admirable to ward off evil eye)", count: 1, source: "رواه ابن السني" },
    ],
  },
  {
    id: "responding-kindness",
    name: "Responding to Kindness",
    nameAr: "الجزاء على الإحسان",
    sectionId: "social",
    items: [
      { id: "rk4", text: "جَزَاكَ اللَّهُ خَيْرًا", translation: "May Allah reward you with good.", count: 1, source: "رواه الترمذي" },
    ],
  },
  {
    id: "responding-love",
    name: "When Told 'I Love You'",
    nameAr: "الجواب لمن قال أحبك",
    sectionId: "social",
    items: [
      { id: "rl1", text: "أَحَبَّكَ اللَّهُ الَّذِي أَحْبَبْتَنِي لَهُ", translation: "May Allah, for whose sake you love me, love you in return.", count: 1, source: "رواه أبو داود" },
    ],
  },
  {
    id: "visiting-sick",
    name: "Visiting the Sick",
    nameAr: "دعاء زيارة المريض",
    sectionId: "social",
    items: [
      { id: "vs1", text: "أَسْأَلُ اللَّهَ الْعَظِيمَ رَبَّ الْعَرْشِ الْعَظِيمِ أَنْ يَشْفِيَكَ", translation: "I ask Allah the Almighty, Lord of the Magnificent Throne, to cure you.", count: 7, source: "رواه أبو داود والترمذي" },
      { id: "vs2", text: "لَا بَأْسَ طَهُورٌ إِنْ شَاءَ اللَّهُ", translation: "Do not worry, it will be a purification, if Allah wills. (Said to the sick person)", count: 1, source: "رواه البخاري" },
    ],
  },
  {
    id: "condolence",
    name: "Condolence",
    nameAr: "التعزية",
    sectionId: "social",
    items: [
      { id: "co1", text: "إِنَّ لِلَّهِ مَا أَخَذَ، وَلَهُ مَا أَعْطَى، وَكُلُّ شَيْءٍ عِنْدَهُ بِأَجَلٍ مُسَمًّى، فَلْتَصْبِرْ وَلْتَحْتَسِبْ", translation: "Indeed, to Allah belongs what He has taken, and to Him belongs what He has given, and everything with Him has an appointed time. So be patient and seek reward from Allah.", count: 1, source: "رواه البخاري ومسلم" },
    ],
  },
  {
    id: "distress",
    name: "Distress & Grief",
    nameAr: "أدعية الكرب والهم",
    sectionId: "hardship",
    items: [
      { id: "d1", text: "لَا إِلَهَ إِلَّا اللَّهُ الْعَظِيمُ الْحَلِيمُ، لَا إِلَهَ إِلَّا اللَّهُ رَبُّ الْعَرْشِ الْعَظِيمِ، لَا إِلَهَ إِلَّا اللَّهُ رَبُّ السَّمَاوَاتِ وَرَبُّ الْأَرْضِ وَرَبُّ الْعَرْشِ الْكَرِيمِ", translation: "None has the right to be worshipped but Allah the Mighty, the Forbearing. None has the right to be worshipped but Allah, Lord of the Magnificent Throne. None has the right to be worshipped but Allah, Lord of the heavens, Lord of the earth, and Lord of the Noble Throne.", count: 1, source: "رواه البخاري ومسلم" },
      { id: "d2", text: "اللَّهُمَّ رَحْمَتَكَ أَرْجُو فَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ، وَأَصْلِحْ لِي شَأْنِي كُلَّهُ، لَا إِلَهَ إِلَّا أَنْتَ", translation: "O Allah, I hope for Your mercy. Do not leave me to myself even for the blink of an eye. Correct all my affairs. None has the right to be worshipped but You.", count: 1, source: "رواه أبو داود" },
      { id: "d3", text: "لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ", translation: "There is none worthy of worship but You, glory be to You, indeed I was among the wrongdoers. (The dua of Prophet Yunus)", count: 40, source: "رواه الترمذي" },
      { id: "d4", text: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَأَعُوذُ بِكَ مِنَ الْعَجْزِ وَالْكَسَلِ، وَأَعُوذُ بِكَ مِنَ الْجُبْنِ وَالْبُخْلِ، وَأَعُوذُ بِكَ مِنْ غَلَبَةِ الدَّيْنِ وَقَهْرِ الرِّجَالِ", translation: "O Allah, I seek refuge in You from anxiety and grief, from weakness and laziness, from cowardice and miserliness, and from being overwhelmed by debt and overpowered by men.", count: 3, source: "رواه البخاري" },
      { id: "d5", text: "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ", translation: "Allah is sufficient for us, and He is the best disposer of affairs.", count: 7, source: "رواه البخاري" },
      { id: "d6", text: "اللَّهُمَّ إِنِّي عَبْدُكَ وَابْنُ عَبْدِكَ وَابْنُ أَمَتِكَ، نَاصِيَتِي بِيَدِكَ، مَاضٍ فِيَّ حُكْمُكَ، عَدْلٌ فِيَّ قَضَاؤُكَ، أَسْأَلُكَ بِكُلِّ اسْمٍ هُوَ لَكَ سَمَّيْتَ بِهِ نَفْسَكَ أَوْ أَنْزَلْتَهُ فِي كِتَابِكَ أَوْ عَلَّمْتَهُ أَحَدًا مِنْ خَلْقِكَ أَوِ اسْتَأْثَرْتَ بِهِ فِي عِلْمِ الْغَيْبِ عِنْدَكَ أَنْ تَجْعَلَ الْقُرْآنَ رَبِيعَ قَلْبِي، وَنُورَ صَدْرِي، وَجَلَاءَ حُزْنِي، وَذَهَابَ هَمِّي", translation: "O Allah, I am Your servant and the son of Your servant and the son of Your female servant. My forelock is in Your hand. Your command over me is forever executed and Your decree over me is just. I ask You by every name belonging to You which You have named Yourself, or revealed in Your Book, or taught to any of Your creation, or have preserved in the knowledge of the Unseen with You, that You make the Quran the spring of my heart and the light of my chest, the banishment of my sadness and the disappearance of my anxiety.", count: 1, source: "رواه أحمد" },
    ],
  },
  {
    id: "anxiety",
    name: "Anxiety & Fear",
    nameAr: "دعاء الخوف والقلق",
    sectionId: "hardship",
    items: [
      { id: "ax1", text: "حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ، عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ", translation: "Allah is sufficient for me. None has the right to be worshipped but Him. Upon Him I rely and He is Lord of the Majestic Throne.", count: 7, source: "رواه أبو داود" },
      { id: "ax2", text: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْجُبْنِ وَأَعُوذُ بِكَ أَنْ أُرَدَّ إِلَى أَرْذَلِ الْعُمُرِ وَأَعُوذُ بِكَ مِنْ فِتْنَةِ الدُّنْيَا وَأَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ", translation: "O Allah, I seek refuge in You from cowardice, and I seek refuge in You from being reduced to a miserable old age, and I seek refuge in You from the trials of this world, and I seek refuge in You from the punishment of the grave.", count: 1, source: "رواه البخاري" },
    ],
  },
  {
    id: "debt",
    name: "Debt & Financial Hardship",
    nameAr: "دعاء قضاء الدين",
    sectionId: "hardship",
    items: [
      { id: "db1", text: "اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ", translation: "O Allah, suffice me with what You have made lawful so that I have no need of what You have forbidden, and make me self-sufficient with Your favor so that I have no need of anyone other than You.", count: 1, source: "رواه الترمذي" },
      { id: "db2", text: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ", translation: "O Allah, I seek refuge in You from anxiety and grief, helplessness and laziness, miserliness and cowardice, and from being overwhelmed by debt and overpowered by people.", count: 1, source: "رواه البخاري" },
    ],
  },
  {
    id: "facing-enemy",
    name: "Facing the Enemy",
    nameAr: "دعاء مواجهة العدو",
    sectionId: "hardship",
    items: [
      { id: "fe1", text: "اللَّهُمَّ أَنْتَ عَضُدِي وَأَنْتَ نَصِيرِي، بِكَ أَحُولُ وَبِكَ أَصُولُ وَبِكَ أُقَاتِلُ", translation: "O Allah, You are my strength and You are my helper. Through You I move and through You I attack and through You I fight.", count: 1, source: "رواه أبو داود والترمذي" },
      { id: "fe2", text: "اللَّهُمَّ إِنَّا نَجْعَلُكَ فِي نُحُورِهِمْ وَنَعُوذُ بِكَ مِنْ شُرُورِهِمْ", translation: "O Allah, we place You before them and seek refuge in You from their evil.", count: 1, source: "رواه أبو داود" },
    ],
  },
  {
    id: "ruqyah",
    name: "Ruqyah",
    nameAr: "الرقية الشرعية",
    sectionId: "hardship",
    items: [
      { id: "r1", text: "بِسْمِ اللَّهِ أَرْقِيكَ، مِنْ كُلِّ شَيْءٍ يُؤْذِيكَ، مِنْ شَرِّ كُلِّ نَفْسٍ أَوْ عَيْنٍ حَاسِدٍ، اللَّهُ يَشْفِيكَ، بِسْمِ اللَّهِ أَرْقِيكَ", translation: "In the Name of Allah I perform ruqyah for you, from everything that harms you, from the evil of every soul and every envious eye. May Allah heal you. In the Name of Allah I perform ruqyah for you.", count: 3, source: "رواه مسلم" },
      { id: "r2", text: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّةِ مِنْ كُلِّ شَيْطَانٍ وَهَامَّةٍ، وَمِنْ كُلِّ عَيْنٍ لَامَّةٍ", translation: "I seek refuge in the perfect words of Allah from every devil and every poisonous creature, and from every envious evil eye.", count: 3, source: "رواه البخاري" },
      { id: "r3", text: "اللَّهُمَّ رَبَّ النَّاسِ أَذْهِبِ الْبَأْسَ، اشْفِ أَنْتَ الشَّافِي، لَا شِفَاءَ إِلَّا شِفَاؤُكَ، شِفَاءً لَا يُغَادِرُ سَقَمًا", translation: "O Allah, Lord of mankind, remove the harm. Heal, for You are the Healer. There is no healing except Your healing, a healing that leaves no trace of sickness.", count: 3, source: "رواه البخاري ومسلم" },
    ],
  },
  {
    id: "hasad",
    name: "Evil Eye Protection",
    nameAr: "أدعية الحسد والعين",
    sectionId: "hardship",
    items: [
      { id: "h1", text: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ", translation: "I seek refuge in the perfect words of Allah from the evil of what He has created.", count: 3, source: "رواه مسلم" },
      { id: "h2", text: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّةِ مِنْ كُلِّ شَيْطَانٍ وَهَامَّةٍ، وَمِنْ كُلِّ عَيْنٍ لَامَّةٍ", translation: "I seek refuge in the perfect words of Allah from every devil, every poisonous creature, and every envious evil eye.", count: 3, source: "رواه البخاري" },
      { id: "h3", text: "مَا شَاءَ اللَّهُ لَا قُوَّةَ إِلَّا بِاللَّهِ", translation: "What Allah wills; there is no power except with Allah.", count: 1, source: "رواه ابن السني" },
    ],
  },
  {
    id: "sickness-self",
    name: "When Ill Yourself",
    nameAr: "دعاء المريض عن نفسه",
    sectionId: "hardship",
    items: [
      { id: "ss1", text: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْبَرَصِ وَالْجُنُونِ وَالْجُذَامِ وَمِنْ سَيِّئِ الأَسْقَامِ", translation: "O Allah, I seek refuge in You from leucoderma, insanity, leprosy and from the worst of all diseases.", count: 1, source: "رواه أبو داود" },
      { id: "ss2", text: "بِسْمِ اللَّهِ — يَضَعُ يَدَهُ عَلَى الْمَكَانِ الَّذِي يَأْلَمُ وَيَقُولُ: بِسْمِ اللَّهِ × ٣ ثُمَّ: أَعُوذُ بِاللَّهِ وَقُدْرَتِهِ مِنْ شَرِّ مَا أَجِدُ وَأُحَاذِرُ", translation: "Place your hand on the area of pain, say 'In the Name of Allah' three times, then: I seek refuge in Allah and His power from the evil of what I find and what I fear.", count: 7, source: "رواه مسلم" },
    ],
  },
  {
    id: "sickness-other",
    name: "When Others Are Ill",
    nameAr: "الدعاء للمريض",
    sectionId: "hardship",
    items: [
      { id: "so1", text: "اللَّهُمَّ رَبَّ النَّاسِ أَذْهِبِ الْبَأْسَ، وَاشْفِهِ وَأَنْتَ الشَّافِي، لَا شِفَاءَ إِلَّا شِفَاؤُكَ، شِفَاءً لَا يُغَادِرُ سَقَمًا", translation: "O Allah, Lord of mankind, remove the harm and heal him, for You are the Healer. There is no healing except Your healing — a healing that leaves no trace of sickness.", count: 1, source: "رواه البخاري ومسلم" },
    ],
  },
  {
    id: "closing-eyes-deceased",
    name: "Closing the Eyes of the Deceased",
    nameAr: "دعاء تغميض الميت",
    sectionId: "hardship",
    items: [
      { id: "cd1", text: "اللَّهُمَّ اغْفِرْ لِفُلَانٍ وَارْفَعْ دَرَجَتَهُ فِي الْمَهْدِيِّينَ، وَاخْلُفْهُ فِي عَقِبِهِ فِي الْغَابِرِينَ، وَاغْفِرْ لَنَا وَلَهُ يَا رَبَّ الْعَالَمِينَ، وَافْسَحْ لَهُ فِي قَبْرِهِ وَنَوِّرْ لَهُ فِيهِ", translation: "O Allah, forgive [name] and elevate his station among those who are guided. Send him along the path of those who came before, and forgive us and him, O Lord of the worlds. Enlarge for him his grave and shed light upon him in it.", count: 1, source: "رواه مسلم" },
    ],
  },
  {
    id: "funeral",
    name: "Funeral Prayer",
    nameAr: "دعاء صلاة الجنازة",
    sectionId: "hardship",
    items: [
      { id: "fn1", text: "اللَّهُمَّ اغْفِرْ لَهُ وَارْحَمْهُ وَعَافِهِ وَاعْفُ عَنْهُ، وَأَكْرِمْ نُزُلَهُ وَوَسِّعْ مُدْخَلَهُ، وَاغْسِلْهُ بِالْمَاءِ وَالثَّلْجِ وَالْبَرَدِ، وَنَقِّهِ مِنَ الْخَطَايَا كَمَا نَقَّيْتَ الثَّوْبَ الأَبْيَضَ مِنَ الدَّنَسِ، وَأَبْدِلْهُ دَارًا خَيْرًا مِنْ دَارِهِ، وَأَهْلًا خَيْرًا مِنْ أَهْلِهِ، وَزَوْجًا خَيْرًا مِنْ زَوْجِهِ، وَأَدْخِلْهُ الْجَنَّةَ وَأَعِذْهُ مِنْ عَذَابِ الْقَبْرِ وَعَذَابِ النَّارِ", translation: "O Allah, forgive him and have mercy on him and pardon him and grant him sound health and be generous with him and cause his entrance to be wide and wash him with water and snow and hail. Cleanse him of his transgressions as white cloth is cleansed of stains. Give him an abode better than his home and a family better than his family and a spouse better than his spouse and admit him into Paradise and protect him from the punishment of the grave and the torment of the Fire.", count: 1, source: "رواه مسلم" },
    ],
  },
  {
    id: "burial",
    name: "Burial Supplication",
    nameAr: "دعاء وضع الميت في القبر",
    sectionId: "hardship",
    items: [
      { id: "bu1", text: "بِسْمِ اللَّهِ وَعَلَى سُنَّةِ رَسُولِ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ", translation: "In the Name of Allah and according to the Sunnah of the Messenger of Allah, peace be upon him. (When placing the deceased in the grave)", count: 1, source: "رواه أبو داود" },
    ],
  },
  {
    id: "grave-visit",
    name: "Visiting the Graves",
    nameAr: "دعاء زيارة القبور",
    sectionId: "hardship",
    items: [
      { id: "gv1", text: "السَّلَامُ عَلَيْكُمْ أَهْلَ الدِّيَارِ مِنَ الْمُؤْمِنِينَ وَالْمُسْلِمِينَ، وَإِنَّا إِنْ شَاءَ اللَّهُ بِكُمْ لَاحِقُونَ، يَرْحَمُ اللَّهُ الْمُسْتَقْدِمِينَ مِنَّا وَالْمُسْتَأْخِرِينَ، نَسْأَلُ اللَّهَ لَنَا وَلَكُمُ الْعَافِيَةَ", translation: "Peace be upon you, O believing and Muslim residents of these dwellings. We will join you, if Allah wills. May Allah have mercy on those who went ahead of us and those who come later. We ask Allah for well-being for us and for you.", count: 1, source: "رواه مسلم" },
    ],
  },
  {
    id: "wind",
    name: "Wind",
    nameAr: "دعاء الريح",
    sectionId: "weather",
    items: [
      { id: "wn1", text: "اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَهَا وَخَيْرَ مَا فِيهَا وَخَيْرَ مَا أُرْسِلَتْ بِهِ، وَأَعُوذُ بِكَ مِنْ شَرِّهَا وَشَرِّ مَا فِيهَا وَشَرِّ مَا أُرْسِلَتْ بِهِ", translation: "O Allah, I ask You for the good of it and the good of what is in it and the good of what was sent with it. And I seek refuge in You from its evil and the evil of what is in it and the evil of what was sent with it.", count: 1, source: "رواه مسلم" },
    ],
  },
  {
    id: "thunder",
    name: "Thunder",
    nameAr: "ذكر سماع الرعد",
    sectionId: "weather",
    items: [
      { id: "th1", text: "سُبْحَانَ الَّذِي يُسَبِّحُ الرَّعْدُ بِحَمْدِهِ وَالْمَلَائِكَةُ مِنْ خِيفَتِهِ", translation: "Glory is to Him Whom the thunder glorifies with His praise, and likewise the angels, in awe of Him.", count: 1, source: "رواه مالك في الموطأ" },
    ],
  },
  {
    id: "rain-dua",
    name: "Supplication for Rain",
    nameAr: "دعاء طلب المطر",
    sectionId: "weather",
    items: [
      { id: "rd1", text: "اللَّهُمَّ اسْقِنَا غَيْثًا مُغِيثًا مَرِيئًا مَرِيعًا نَافِعًا غَيْرَ ضَارٍّ، عَاجِلًا غَيْرَ آجِلٍ", translation: "O Allah, send down upon us rain that is relieving, wholesome, fresh, abundant and beneficial without being harmful — soon, not late.", count: 1, source: "رواه أبو داود" },
    ],
  },
  {
    id: "rain-after",
    name: "When It Rains",
    nameAr: "دعاء نزول المطر",
    sectionId: "weather",
    items: [
      { id: "ra1", text: "اللَّهُمَّ صَيِّبًا نَافِعًا", translation: "O Allah, make it a beneficial rain.", count: 1, source: "رواه البخاري" },
      { id: "ra2", text: "مُطِرْنَا بِفَضْلِ اللَّهِ وَرَحْمَتِهِ", translation: "We have been given rain by the grace and mercy of Allah. (Said after rain)", count: 1, source: "رواه البخاري ومسلم" },
    ],
  },
  {
    id: "crescent-moon",
    name: "Sighting the Crescent Moon",
    nameAr: "دعاء رؤية الهلال",
    sectionId: "weather",
    items: [
      { id: "cm1", text: "اللَّهُ أَكْبَرُ، اللَّهُمَّ أَهِلَّهُ عَلَيْنَا بِالأَمْنِ وَالإِيمَانِ وَالسَّلَامَةِ وَالإِسْلَامِ، وَالتَّوْفِيقِ لِمَا تُحِبُّ وَتَرْضَى، رَبُّنَا وَرَبُّكَ اللَّهُ", translation: "Allah is the Greatest. O Allah, cause this moon to pass over us with security and faith, with safety and Islam, and with the ability to do what You love and are pleased with. Our Lord and your Lord is Allah.", count: 1, source: "رواه الترمذي" },
    ],
  },
  {
    id: "clear-weather",
    name: "Clear Weather",
    nameAr: "دعاء انقشاع السحاب",
    sectionId: "weather",
    items: [
      { id: "cw1", text: "مُطِرْنَا بِنَوْءِ كَذَا وَكَذَا — بَلْ قُولُوا: مُطِرْنَا بِفَضْلِ اللَّهِ وَرَحْمَتِهِ", translation: "Do not say 'we were rained upon by such and such a star'; rather say: We have been given rain by the grace and mercy of Allah.", count: 1, source: "رواه البخاري ومسلم" },
    ],
  },
  {
    id: "general",
    name: "General Remembrance",
    nameAr: "أذكار عامة",
    sectionId: "virtue",
    items: [
      { id: "g1", text: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ", translation: "There is no might and no power except with Allah.", count: 10, source: "رواه البخاري ومسلم" },
      { id: "g2", text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ", translation: "Glory is to Allah and praise is to Him. Glory is to Allah the Almighty.", count: 100, source: "رواه البخاري ومسلم" },
      { id: "g3", text: "سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ", translation: "Glory is to Allah, praise is to Allah, none has the right to be worshipped but Allah, and Allah is the Greatest.", count: 10, source: "رواه مسلم" },
      { id: "g4", text: "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ", translation: "O Allah, send blessings and peace upon our Prophet Muhammad.", count: 10, source: "رواه الطبراني" },
      { id: "g5", text: "رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ", translation: "My Lord, forgive me and accept my repentance. You are the Accepter of Repentance, the Most Merciful.", count: 100, source: "رواه أبو داود والترمذي" },
      { id: "g6", text: "اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ", translation: "O Allah, help me to remember You, to thank You, and to worship You in the best way.", count: 3, source: "رواه أبو داود" },
    ],
  },
  {
    id: "istighfar",
    name: "Seeking Forgiveness",
    nameAr: "الاستغفار والتوبة",
    sectionId: "virtue",
    items: [
      { id: "ig1", text: "أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ", translation: "I seek the forgiveness of Allah and repent to Him.", count: 100, source: "رواه البخاري ومسلم" },
      { id: "ig2", text: "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ", translation: "I seek the forgiveness of Allah the Almighty, besides Whom there is no god, the Ever-Living, the Eternal Sustainer, and I repent to Him.", count: 3, source: "رواه أبو داود والترمذي" },
      { id: "ig3", text: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ خَلَقْتَنِي وَأَنَا عَبْدُكَ وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ", translation: "O Allah, You are my Lord, none has the right to be worshipped but You. You created me and I am Your servant, and I abide to Your covenant and promise as best I can. I seek refuge in You from the evil of what I have done. I acknowledge Your blessing upon me, and I acknowledge my sin, so forgive me, for none forgives sins but You. (Sayyid al-Istighfar)", count: 1, source: "رواه البخاري" },
    ],
  },
  {
    id: "salawat",
    name: "Salawat (Blessings on Prophet)",
    nameAr: "الصلاة على النبي",
    sectionId: "virtue",
    items: [
      { id: "sw1", text: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ", translation: "O Allah, send prayers upon Muhammad and the family of Muhammad, just as You sent prayers upon Ibrahim and the family of Ibrahim. Verily, You are full of praise and majesty. O Allah, send blessings upon Muhammad and the family of Muhammad, just as You sent blessings upon Ibrahim and the family of Ibrahim. Verily, You are full of praise and majesty.", count: 10, source: "رواه البخاري ومسلم" },
      { id: "sw2", text: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ النَّبِيِّ الأُمِّيِّ وَعَلَى آلِهِ وَصَحْبِهِ وَسَلِّمْ", translation: "O Allah, send blessings and peace upon Muhammad, the unlettered Prophet, and upon his family and companions.", count: 10 },
    ],
  },
  {
    id: "quran-recitation",
    name: "Before Reciting Quran",
    nameAr: "أذكار تلاوة القرآن",
    sectionId: "virtue",
    items: [
      { id: "qr1", text: "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ", translation: "I seek refuge in Allah from Satan the accursed. (Before reciting Quran)", count: 1 },
      { id: "qr2", text: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ", translation: "In the Name of Allah, the Most Gracious, the Most Merciful.", count: 1 },
    ],
  },
  {
    id: "various-duas",
    name: "Various Beneficial Duas",
    nameAr: "أدعية متنوعة مأثورة",
    sectionId: "virtue",
    items: [
      { id: "vd1", text: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ", translation: "Our Lord, give us in this world that which is good and in the Hereafter that which is good, and save us from the punishment of the Fire.", count: 3, source: "رواه البخاري ومسلم" },
      { id: "vd2", text: "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْهُدَى وَالتُّقَى وَالْعَفَافَ وَالْغِنَى", translation: "O Allah, I ask You for guidance, piety, chastity and self-sufficiency.", count: 1, source: "رواه مسلم" },
      { id: "vd3", text: "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْجَنَّةَ وَأَعُوذُ بِكَ مِنَ النَّارِ", translation: "O Allah, I ask You for Paradise and I seek refuge in You from the Fire.", count: 3, source: "رواه أبو داود" },
      { id: "vd4", text: "اللَّهُمَّ أَصْلِحْ لِي دِينِيَ الَّذِي هُوَ عِصْمَةُ أَمْرِي وَأَصْلِحْ لِي دُنْيَايَ الَّتِي فِيهَا مَعَاشِي وَأَصْلِحْ لِي آخِرَتِيَ الَّتِي فِيهَا مَعَادِي وَاجْعَلِ الْحَيَاةَ زِيَادَةً لِي فِي كُلِّ خَيْرٍ وَاجْعَلِ الْمَوْتَ رَاحَةً لِي مِنْ كُلِّ شَرٍّ", translation: "O Allah, set right for me my religion which is the safeguard of my affairs. And set right for me the affairs of my world wherein is my living. And set right for me my Hereafter to which is my return. And make life for me an increase in every good and make death for me a relief from every evil.", count: 1, source: "رواه مسلم" },
      { id: "vd5", text: "اللَّهُمَّ إِنِّي أَعُوذُ بِرِضَاكَ مِنْ سَخَطِكَ وَبِمُعَافَاتِكَ مِنْ عُقُوبَتِكَ وَأَعُوذُ بِكَ مِنْكَ لَا أُحْصِي ثَنَاءً عَلَيْكَ أَنْتَ كَمَا أَثْنَيْتَ عَلَى نَفْسِكَ", translation: "O Allah, I seek refuge in Your pleasure from Your anger, and in Your pardon from Your punishment, and I seek refuge in You from You. I cannot count Your praises, You are as You have praised Yourself.", count: 1, source: "رواه مسلم" },
    ],
  },
  {
    id: "kaffaratul-majlis",
    name: "Expiation of Gatherings",
    nameAr: "كفارة المجلس",
    sectionId: "virtue",
    items: [
      { id: "km1", text: "سُبْحَانَكَ اللَّهُمَّ وَبِحَمْدِكَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا أَنْتَ، أَسْتَغْفِرُكَ وَأَتُوبُ إِلَيْكَ", translation: "Glory is to You O Allah and praise. I bear witness that none has the right to be worshipped but You. I seek Your forgiveness and repent to You.", count: 1, source: "رواه أبو داود والترمذي" },
    ],
  },
];
