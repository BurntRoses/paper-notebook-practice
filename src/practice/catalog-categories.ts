/** Categories describe the learner's stage or assessment purpose; subjects are filters. */
export const CATALOG_CATEGORIES=['小学','初中与中考','高中与高考','大学课程','研究生考试','公务员与招聘','职业资格','国际课程与升学','语言考试','公民与入籍','艺术与音乐','通用排版'] as const;
export type CatalogCategory=typeof CATALOG_CATEGORIES[number];
/** Previously shared bookmarks keep their meaning after renaming. */
export const CATEGORY_ALIASES:Record<string,CatalogCategory>={'中高考':'高中与高考','考公':'公务员与招聘','考研':'研究生考试','工程与资格':'职业资格','海外升学':'国际课程与升学','入籍与公民':'公民与入籍','艺术与设计':'艺术与音乐','科学与图像':'高中与高考','通用版式':'通用排版'};
