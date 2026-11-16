/** Categories describe the learner's stage or assessment purpose; subjects are filters. */
export const CATALOG_CATEGORIES=['小学','初中与中考','高中与高考','大学课程','研究生考试','公务员与招聘','职业资格','国际课程与升学','语言考试','公民与入籍','艺术与音乐','通用排版'] as const;
export type CatalogCategory=typeof CATALOG_CATEGORIES[number];
const familyCategory:Record<string,CatalogCategory>={
 '小学':'小学','primary-school':'小学','初中':'初中与中考','高中':'高中与高考','高考':'高中与高考',
 '高校期末':'大学课程','大学':'大学课程','大学英语四级（CET-4）':'大学课程','大学 · CET-6':'大学课程','工程课程':'大学课程','engineering-course':'大学课程',
 '研究生考试':'研究生考试','postgraduate':'研究生考试','公务员考试':'公务员与招聘','civil-service':'公务员与招聘','通用能力':'公务员与招聘',
 '职业资格':'职业资格','计算机等级':'职业资格','工程资格':'职业资格','engineering-qualification':'职业资格',
 '国际中学课程':'国际课程与升学','海外升学考试':'国际课程与升学','international-school':'国际课程与升学','international-admissions':'国际课程与升学',
 'IELTS':'语言考试','外语考试':'语言考试','语言能力考试':'语言考试','language-certification':'语言考试',
 '公民与入籍':'公民与入籍','citizenship':'公民与入籍','艺术与设计':'艺术与音乐','音乐与表演':'艺术与音乐','arts-performance':'艺术与音乐',
 '科学与图像':'高中与高考','通用':'通用排版'
};
export function catalogCategory(text:string,family=''):CatalogCategory {
 if(familyCategory[family])return familyCategory[family];
 const s=text.toLowerCase();
 if(/小学|小[一二三四五六]|primary|key stage [12]|\bks[12]\b/.test(s))return '小学';
 if(/初中|中考|初[一二三]|junior|lower secondary/.test(s))return '初中与中考';
 if(/考研|研究生|硕士招生|postgraduate|数一|英一|408/.test(s))return '研究生考试';
 if(/考公|公务员|行测|申论|招聘|civil.service/.test(s))return '公务员与招聘';
 if(/入籍|公民|citizen|civics|naturalisation|naturalization|life in the uk/.test(s))return '公民与入籍';
 if(/艺术|美术|音乐|作品集|素描|\b(?:art|arts|music)\b|design portfolio/.test(s))return '艺术与音乐';
 if(/雅思|托福|日语|韩语|法语|德语|汉语|ielts|toefl|jlpt|topik|delf|goethe|\bhsk\b|language/.test(s))return '语言考试';
 if(/海外|国际|a[- ]?level|igcse|gcse|\bsat\b|\bact\b|\bib\b|\bap\b|international/.test(s))return '国际课程与升学';
 if(/资格|注册|会计|审计|计算机等级|cpa|ncre/.test(s))return '职业资格';
 if(/高考|高中|高[一二三]|gaokao|upper secondary/.test(s))return '高中与高考';
 if(/大学|本科|高校|工程|university|college|\bmit\b|pku|ecnu|ustc/.test(s))return '大学课程';
 return '通用排版';
}
/** Previously shared bookmarks keep their meaning after renaming. */
export const CATEGORY_ALIASES:Record<string,CatalogCategory>={'中高考':'高中与高考','考公':'公务员与招聘','考研':'研究生考试','工程与资格':'职业资格','海外升学':'国际课程与升学','入籍与公民':'公民与入籍','艺术与设计':'艺术与音乐','科学与图像':'高中与高考','通用版式':'通用排版'};
