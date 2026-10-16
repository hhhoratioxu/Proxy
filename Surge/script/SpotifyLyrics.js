/* VerseLyrics Surge adapter 7; core 0.4.8.
 * Original host bridge. No external JavaScript runtime.
 */
/*
UNICODE LICENSE V3

COPYRIGHT AND PERMISSION NOTICE

Copyright © 1991-2026 Unicode, Inc.

NOTICE TO USER: Carefully read the following legal agreement. BY
DOWNLOADING, INSTALLING, COPYING OR OTHERWISE USING DATA FILES, AND/OR
SOFTWARE, YOU UNEQUIVOCALLY ACCEPT, AND AGREE TO BE BOUND BY, ALL OF THE
TERMS AND CONDITIONS OF THIS AGREEMENT. IF YOU DO NOT AGREE, DO NOT
DOWNLOAD, INSTALL, COPY, DISTRIBUTE OR USE THE DATA FILES OR SOFTWARE.

Permission is hereby granted, free of charge, to any person obtaining a
copy of data files and any associated documentation (the "Data Files") or
software and any associated documentation (the "Software") to deal in the
Data Files or Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, and/or sell
copies of the Data Files or Software, and to permit persons to whom the
Data Files or Software are furnished to do so, provided that either (a)
this copyright and permission notice appear with all copies of the Data
Files or Software, or (b) this copyright and permission notice appear in
associated Documentation.

THE DATA FILES AND SOFTWARE ARE PROVIDED "AS IS", WITHOUT WARRANTY OF ANY
KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT OF
THIRD PARTY RIGHTS.

IN NO EVENT SHALL THE COPYRIGHT HOLDER OR HOLDERS INCLUDED IN THIS NOTICE
BE LIABLE FOR ANY CLAIM, OR ANY SPECIAL INDIRECT OR CONSEQUENTIAL DAMAGES,
OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS,
WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION,
ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THE DATA
FILES OR SOFTWARE.

Except as contained in this notice, the name of a copyright holder shall
not be used in advertising or otherwise to promote the sale, use or other
dealings in these Data Files or Software without prior written
authorization of the copyright holder.
*/
(() => {
"use strict";
/* VerseLyrics 0.4.8 — original core, 2026-10-16.
 * Rewrites Spotify color-lyrics JSON and protobuf; no third-party script runtime.
 * Public protocol field numbers and service endpoints are documented in README.md.
 * Egern API: export default async function(ctx), ctx.http, ctx.storage.
 */
const VERSION = "0.4.8";
const KEY = "VerseLyrics.v1.cache";
const STATUS = "VerseLyrics.v1.status";
const EVENTS = "VerseLyrics.v1.events";
const LIMIT = 512 * 1024;
const BODY_LIMIT = 256 * 1024;
const SERVICE_LIMIT = 96 * 1024;
const PLAYER_LIMIT = 128 * 1024;
const CACHE_LIMIT = 64000;
const CACHE_COUNT = 128;
const MAX_LINES = 600;
const INTERNAL = "x-verselyrics-internal";
const MARKER = "x-verselyrics";
// Public wire identifier for Spotify's lyrics section, not a donor track.
const HOST = "(?:spclient\\.wg|[a-z0-9-]+-spclient)\\.spotify\\.com";
const LYRIC_URL = new RegExp("^https://(" + HOST + ")(?::443)?/color-lyrics/v2/track/([0-9A-Za-z]{22})(?:/image/[^?#\\s]+)?/?(?:\\?.*)?$");
const LANGUAGES = ["zh-CN", "zh-TW", "en", "ja", "ko", "fr", "de", "es", "pt", "it", "ru", "ar", "hi", "id", "vi", "th", "tr", "nl", "pl", "sv", "uk", "he", "fa", "ms", "el"];
const SOURCES = { lrclib: "LRCLIB", qq: "QQ 音乐", netease: "网易云音乐", kugou: "酷狗音乐", kuwo: "酷我音乐", lyricsovh: "lyrics.ovh" };
const SOURCE_REVISION = 3;
const SOURCE_REQUEST_LIMIT = 12;
const SOURCE_BYTE_LIMIT = 256 * 1024;
const NEW_SOURCE_LIMIT = 96 * 1024;
const B62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const goodObject = x => x !== null && typeof x === "object" && !Array.isArray(x);
const str = x => typeof x === "string" ? x : "";
const truth = x => x === true || x === "true";
const clean = x => str(x).replace(/\u0000/g, "").trim();
const normal = x => clean(x).normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
// BEGIN GENERATED HAN VARIANTS
// Unicode 17.0.0 Unihan kSimplifiedVariant data; see NOTICE-UNICODE.txt.
// Fixed-width sorted tables from the unchanged unambiguous Unicode pairs.
// Binary search avoids constructing a per-invocation Map of every variant.
const HAN_TABLES = [
  [1,2,"㑯㑔㑳㑇㑶㐹㓨刾㘚㘎㜄㚯㜏㛣㠏㟆㥮㤘㩜㨫㩳㧐㩵擜㻽㻪䁻䀥䃮鿎䊷䌶䋙䌺䋚䌻䋹䌿䋻䌾䎱䎬䙡䙌䜀䜧䝼䞍䥇䦂䥑鿏䥱䥾䦛䦶䦟䦷䯀䯅䰾鲃䱷䲣䱽䲝䲁鳚䲘鳤䴉鹮丟丢並并亂乱亞亚佇伫併并來来侖仑侶侣俁俣係系俔伣俠侠俥伡倀伥倆俩倈俫倉仓個个們们倫伦倲㑈偉伟偑㐽側侧偵侦偽伪傌㐷傑杰傖伧傘伞備备傢家傭佣傯偬傳传傴伛債债傷伤傾倾僂偻僅仅僉佥僑侨僕仆僞伪僥侥僨偾價价儀仪儁㑺儂侬億亿儈侩儉俭儐傧儔俦儕侪儘尽償偿優优儲储儷俪儸㑩儺傩儻傥儼俨兌兑兒儿兗兖內内兩两冊册冪幂凈净凍冻凜凛凱凯別别刪删剄刭則则剋克剎刹剗刬剛刚剝剥剮剐剴剀創创劃划劇剧劉刘劊刽劌刿劍剑劏㓥劑剂劚㔉勁劲動动務务勛勋勝胜勞劳勢势勩勚勱劢勵励勸劝勻匀匭匦匯汇匱匮區区協协卻却厙厍厠厕厭厌厲厉厴厣參参叄叁叢丛吒咤吳吴吶呐呂吕咼呙員员唄呗唚吣問问啓启啞哑啟启啢唡喎㖞喚唤喪丧喬乔單单喲哟嗆呛嗇啬嗊唝嗎吗嗚呜嗩唢嗶哔嘆叹嘍喽嘓啯嘔呕嘖啧嘗尝嘜唛嘩哗嘮唠嘯啸嘰叽嘵哓嘸呒嘽啴噓嘘噚㖊噝咝噠哒噥哝噦哕噯嗳噲哙噴喷噸吨嚀咛嚇吓嚌哜嚕噜嚙啮嚦呖嚨咙嚮向嚲亸嚳喾嚴严嚶嘤囀啭囁嗫囂嚣囅冁囈呓囉啰囌苏囑嘱囪囱圇囵國国圍围園园圓圆圖图團团垵埯垻坝埡垭埰采執执堅坚堊垩堖垴堝埚堯尧報报場场塊块塋茔塏垲塒埘塗涂塢坞塤埙塵尘塹堑墊垫墜坠墮堕墳坟墶垯墻墙墾垦壇坛壋垱壓压壘垒壙圹壚垆壞坏壟垄壠垅壢坜壩坝壪塆壯壮壺壶壼壸壽寿夠够夢梦夾夹奐奂奧奥奩奁奪夺奮奋奼姹妝妆姍姗姦奸娛娱婁娄婦妇婭娅媧娲媯妫媰㛀媼媪媽妈嫗妪嫵妩嫻娴嫿婳嬀妫嬃媭嬈娆嬋婵嬌娇嬙嫱嬡嫒嬤嬷嬪嫔嬰婴嬸婶孋㛤孌娈孫孙學学孿孪宮宫寢寝實实寧宁審审寫写寬宽寯㝦寵宠寶宝將将專专尋寻對对導导尷尴屆届屍尸屓屃屜屉屢屡層层屨屦屬属岡冈峴岘島岛峽峡崍崃崗岗崢峥崬岽嵐岚嵾㟥嶁嵝嶄崭嶇岖嶔嵚嶗崂嶠峤嶢峣嶧峄嶨峃嶮崄嶴岙嶸嵘嶺岭嶼屿巋岿巒峦巔巅巰巯帥帅師师帳帐帶带幀帧幃帏幓㡎幗帼幘帻幟帜幣币幫帮幬帱幹干幺么幾几庫库廁厕廂厢廄厩廈厦廎庼廚厨廝厮廟庙廠厂廡庑廢废廣广廩廪廬庐廳厅弒弑弳弪張张強强彆别彈弹彌弥彎弯彙汇彞彝彠彟彥彦彲彨後后徑径從从徠徕徹彻恆恒恥耻悅悦悞悮悵怅悶闷惡恶惱恼惲恽惻恻愛爱愜惬愨悫愴怆愷恺愾忾慄栗態态慍愠慘惨慚惭慟恸慣惯慤悫慪怄慫怂慮虑慳悭慶庆慺㥪憂忧憊惫憍㤭憐怜憑凭憒愦憖慭憚惮憤愤憫悯憮怃憲宪憶忆懇恳應应懌怿懍懔懞蒙懟怼懣懑懤㤽懧㤖懨恹懲惩懶懒懷怀懸悬懺忏懼惧懾慑戀恋戇戆戔戋戧戗戩戬戱戯戲戏戶户拋抛挩捝挾挟捨舍捫扪捲卷掃扫掄抡掆㧏掗挜掙挣掛挂採采揀拣揚扬換换揮挥損损搖摇搗捣搵揾搶抢摑掴摜掼摟搂摯挚摳抠摶抟摻掺撈捞撏挦撐撑撓挠撝㧑撟挢撣掸撥拨撫抚撲扑撳揿撻挞撾挝撿捡擁拥擄掳擇择擊击擋挡擓㧟擔担據据擠挤擥㧛擬拟擯摈擰拧擱搁擲掷擴扩擷撷擺摆擻擞擼撸擽㧰擾扰攄摅攆撵攏拢攔拦攖撄攙搀攛撺攜携攝摄攢攒攣挛攤摊攪搅攬揽敗败敘叙敵敌數数斂敛斃毙斆敩斕斓斬斩斷断於于時时晉晋晝昼暈晕暉晖暘旸暢畅暫暂曄晔曆历曇昙曉晓曏向曖暧曠旷曨昽曬晒書书會会朧胧東东柵栅桿杆梔栀梘枧條条梟枭梲棁棄弃棖枨棗枣棟栋棡㭎棧栈棲栖棶梾椏桠椲㭏楊杨楓枫楨桢業业極极榪杩榮荣榲榅榿桤構构槍枪槤梿槧椠槨椁槮椮槳桨槶椢槼椝樁桩樂乐樅枞樓楼標标樞枢樢㭤樣样樫㭴樳桪樸朴樹树樺桦樿椫橈桡橋桥機机橢椭橫横檁檩檉柽檔档檜桧檟槚檢检檣樯檮梼檯台檳槟檸柠檻槛櫃柜櫓橹櫚榈櫛栉櫝椟櫞橼櫟栎櫥橱櫧槠櫨栌櫪枥櫫橥櫬榇櫱蘖櫳栊櫸榉櫻樱欄栏權权欏椤欒栾欖榄欞棂欽钦歐欧歟欤歡欢歲岁歷历歸归歿殁殘残殞殒殤殇殨㱮殫殚殮殓殯殡殰㱩殲歼殺杀殻壳殼壳毀毁毆殴毿毵氂牦氈毡氌氇氣气氫氢氬氩氳氲決决沒没沖冲況况洶汹浹浃涇泾涼凉淚泪淥渌淪沦淵渊淶涞淺浅渙涣減减渢沨渦涡測测渾浑湊凑湞浈湯汤溈沩準准溝沟溫温溮浉溳涢滄沧滅灭滌涤滎荥滬沪滯滞滲渗滸浒滻浐滾滚滿满漁渔漊溇漚沤漢汉漣涟漬渍漲涨漵溆漸渐漿浆潁颍潑泼潔洁潙沩潚㴋潛潜潤润潯浔潰溃潷滗潿涠澀涩澆浇澇涝澐沄澗涧澠渑澤泽澦滪澩泶澮浍澱淀澾㳠濁浊濃浓濄㳡濕湿濘泞濚溁濛蒙濜浕濟济濤涛濧㳔濫滥濰潍濱滨濺溅濼泺濾滤瀂澛瀅滢瀆渎瀇㲿瀉泻瀏浏瀕濒瀘泸瀝沥瀟潇瀠潆瀦潴瀧泷瀨濑瀲潋瀾澜灃沣灄滠灑洒灕漓灘滩灝灏灣湾灤滦灧滟災灾為为烏乌烴烃無无煉炼煒炜煙烟煢茕煥焕煩烦煬炀煱㶽熅煴熒荧熗炝熱热熲颎熾炽燁烨燈灯燒烧燙烫燜焖營营燦灿燭烛燴烩燶㶶燼烬燾焘爍烁爐炉爛烂爭争爲为爺爷爾尔牆墙牘牍牽牵犖荦犢犊犧牺狀状狹狭狽狈猙狰猶犹猻狲獁犸獄狱獅狮獎奖獨独獪狯獫猃獮狝獰狞獱㺍獲获獵猎獷犷獸兽獺獭獻献獼猕玀猡現现琺珐琿珲瑋玮瑒玚瑣琐瑤瑶瑩莹瑪玛瑲玱璉琏璡琎璣玑璦瑷璫珰璯㻅環环璵玙璸瑸璽玺瓊琼瓏珑瓔璎瓚瓒甌瓯產产産产畝亩畢毕畫画異异當当疇畴疊叠痙痉痾疴瘂痖瘋疯瘍疡瘓痪瘞瘗瘡疮瘧疟瘮瘆瘲疭瘺瘘瘻瘘療疗癆痨癇痫癉瘅癘疠癟瘪癢痒癤疖癥症癧疬癩癞癬癣癭瘿癮瘾癰痈癱瘫癲癫發发皚皑皰疱皸皲皺皱盜盗盞盏盡尽監监盤盘盧卢盪荡眥眦眾众睏困睜睁睞睐瞘眍瞜䁖瞞瞒瞶瞆瞼睑矇蒙矓眬矚瞩矯矫硃朱硜硁硤硖硨砗硯砚碩硕碭砀碸砜確确碼码碽䂵磑硙磚砖磠硵磣碜磧碛磯矶磽硗磾䃅礄硚礆硷礎础礙碍礦矿礪砺礫砾礬矾礱砻祿禄禍祸禎祯禕祎禡祃禦御禪禅禮礼禰祢禱祷禿秃秈籼稅税稈秆稏䅉稟禀種种稱称穀谷穇䅟穌稣積积穎颖穠秾穡穑穢秽穩稳穫获穭稆窩窝窪洼窮穷窯窑窵窎窶窭窺窥竄窜竅窍竇窦竈灶竊窃竪竖競竞筆笔筍笋筧笕筴䇲箋笺箏筝節节範范築筑篋箧篔筼篤笃篩筛篳筚簀箦簍篓簞箪簡简簣篑簫箫簹筜簽签簾帘籃篮籌筹籔䉤籙箓籛篯籜箨籟籁籠笼籤签籩笾籪簖籬篱籮箩籲吁粵粤糝糁糞粪糧粮糲粝糴籴糶粜糹纟糾纠紀纪紂纣約约紅红紆纡紇纥紈纨紉纫紋纹納纳紐纽紓纾純纯紕纰紖纼紗纱紘纮紙纸級级紛纷紜纭紝纴紡纺紬䌷細细紱绂紲绁紳绅紵纻紹绍紺绀紼绋紿绐絀绌終终組组絅䌹絆绊絎绗結结絕绝絛绦絝绔絞绞絡络絢绚給给絨绒絰绖統统絲丝絳绛絶绝絹绢綁绑綃绡綆绠綈绨綉绣綌绤綏绥綐䌼經经綜综綞缍綠绿綢绸綣绻綫线綬绶維维綯绹綰绾綱纲網网綳绷綴缀綵䌽綸纶綹绺綺绮綻绽綽绰綾绫綿绵緄绲緇缁緊紧緋绯緑绿緒绪緓绬緔绱緗缃緘缄緙缂緝缉緞缎締缔緡缗緣缘緦缌編编緩缓緬缅緯纬緱缑緲缈練练緶缏緹缇緼缊縈萦縉缙縊缢縋缒縐绉縑缣縕缊縗缞縛缚縝缜縞缟縟缛縣县縧绦縫缝縭缡縮缩縱纵縲缧縳䌸縵缦縶絷縷缕縹缥總总績绩繃绷繅缫繆缪繒缯織织繕缮繚缭繞绕繢缋繩绳繪绘繫系繭茧繮缰繯缳繰缲繳缴繸䍁繹绎繼继繽缤繾缱繿䍀纇颣纈缬纊纩續续纍累纏缠纓缨纔才纖纤纘缵纜缆缽钵罃䓨罈坛罌罂罎坛罰罚罵骂罷罢羅罗羆罴羈羁羋芈羥羟義义習习翬翚翹翘翽翙耬耧耮耢聖圣聞闻聯联聰聪聲声聳耸聵聩聶聂職职聹聍聽听聾聋肅肃脅胁脈脉脛胫脫脱脹胀腎肾腖胨腡脶腦脑腫肿腳脚腸肠膃腽膋䒿膕腘膚肤膞䏝膠胶膩腻膽胆膾脍膿脓臇䐪臉脸臍脐臏膑臘腊臚胪臟脏臠脔臢臜臨临臺台與与興兴舉举舊旧艙舱艤舣艦舰艫舻艱艰艷艳芻刍苧苎茲兹荊荆莊庄莖茎莢荚莧苋華华萇苌萊莱萬万萴荝萵莴葉叶葒荭葤荮葦苇葯药葷荤蒓莼蒔莳蒞莅蒼苍蓀荪蓋盖蓮莲蓯苁蓴莼蓽荜蔔卜蔞蒌蔣蒋蔥葱蔦茑蔭荫蕁荨蕆蒇蕎荞蕒荬蕓芸蕕莸蕘荛蕢蒉蕩荡蕪芜蕭萧蕷蓣薀蕰薈荟薊蓟薌芗薑姜薔蔷薘荙薟莶薦荐薩萨薳䓕薴苎薵䓓薺荠藍蓝藎荩藝艺藥药藪薮藭䓖藴蕴藶苈藹蔼藺蔺蘀萚蘄蕲蘆芦蘇苏蘊蕴蘚藓蘞蔹蘢茏蘺蓠蘿萝虆蔂處处虛虚虜虏號号虧亏虯虬蛺蛱蛻蜕蜆蚬蝕蚀蝟猬蝦虾蝸蜗螄蛳螞蚂螢萤螮䗖螻蝼螿螀蟄蛰蟈蝈蟎螨蟣虮蟬蝉蟯蛲蟲虫蟶蛏蟻蚁蠁蚃蠅蝇蠆虿蠐蛴蠑蝾蠟蜡蠣蛎蠨蟏蠱蛊蠶蚕蠻蛮衆众衊蔑術术衕同衚胡衛卫衝冲衹只袞衮裊袅裏里補补裝装製制複复褌裈褘袆褲裤褳裢褸褛褻亵襇裥襌褝襏袯襖袄襝裣襠裆襤褴襪袜襯衬襲袭襴襕見见覎觃規规覓觅視视覘觇覡觋覥觍覦觎親亲覬觊覯觏覲觐覷觑覺觉覽览覿觌觀观觴觞觶觯觸触訁讠訂订訃讣計计訊讯訌讧討讨訐讦訒讱訓训訕讪訖讫託讬記记訛讹訝讶訟讼訢䜣訣诀訥讷訩讻訪访設设許许訴诉訶诃診诊詁诂詆诋詎讵詐诈詒诒詔诏評评詖诐詗诇詘诎詛诅詞词詡诩詢询詣诣試试詩诗詫诧詬诟詭诡詮诠詰诘話话該该詳详詵诜詼诙詿诖誄诔誅诛誆诓誇夸認认誑诳誒诶誕诞誘诱誚诮語语誠诚誡诫誣诬誤误誥诰誦诵誨诲說说説说誰谁課课誶谇誹诽誼谊誾訚調调諂谄諄谆談谈諉诿請请諍诤諏诹諑诼諒谅論论諗谂諛谀諜谍諝谞諞谝諢诨諤谔諦谛諧谐諫谏諭谕諮谘諱讳諳谙諶谌諷讽諸诸諺谚諼谖諾诺謀谋謁谒謂谓謄誊謅诌謊谎謎谜謐谧謔谑謖谡謗谤謙谦謚谥講讲謝谢謠谣謡谣謨谟謫谪謬谬謭谫謳讴謹谨謾谩證证譎谲譏讥譖谮識识譙谯譚谭譜谱譫谵譯译議议譴谴護护譼䛓譽誉讀读讅谉變变讋詟讌䜩讎雠讒谗讓让讕谰讖谶讜谠讞谳豈岂豎竖豐丰豬猪豶豮貓猫貙䝙貝贝貞贞貟贠負负財财貢贡貧贫貨货販贩貪贪貫贯責责貯贮貰贳貲赀貳贰貴贵貶贬貸贷貺贶費费貼贴貽贻貿贸賀贺賁贲賂赂賃赁賄贿賅赅資资賈贾賊贼賑赈賒赊賓宾賕赇賙赒賚赉賜赐賞赏賠赔賡赓賢贤賣卖賤贱賦赋賧赕質质賫赍賭赌賰䞐賴赖賵赗賺赚賻赙購购賽赛賾赜贄贽贅赘贇赟贈赠贊赞贋赝贍赡贏赢贐赆贔赑贖赎贗赝贛赣赬赪趕赶趙赵趨趋趲趱跡迹踐践踴踊蹌跄蹕跸蹣蹒蹺跷躂跶躉趸躊踌躋跻躍跃躎䟢躑踯躒跞躓踬躕蹰躚跹躡蹑躥蹿躦躜躪躏軀躯車车軋轧軌轨軍军軑轪軒轩軔轫軛轭軟软軤轷軫轸軲轱軸轴軹轵軺轺軻轲軼轶軾轼較较輅辂輇辁輈辀載载輊轾輒辄輔辅輕轻輛辆輜辎輝辉輞辋輟辍輥辊輦辇輩辈輪轮輬辌輯辑輳辏輸输輻辐輼辒輾辗輿舆轀辒轂毂轄辖轅辕轆辘轉转轍辙轎轿轔辚轟轰轡辔轢轹轤轳辦办辭辞辮辫辯辩農农迴回逕迳這这連连進进運运過过達达違违遙遥遜逊遞递遠远適适遲迟遷迁選选遺遗遼辽邁迈還还邇迩邊边邏逻邐逦郟郏郵邮鄆郓鄉乡鄒邹鄔邬鄖郧鄧邓鄭郑鄰邻鄲郸鄴邺鄶郐鄺邝酇酂酈郦醖酝醜丑醞酝醟蒏醫医醬酱醱酦釀酿釁衅釃酾釅酽釋释釐厘釒钅釓钆釔钇釕钌釗钊釘钉釙钋針针釣钓釤钐釧钏釩钒釵钗釷钍釹钕釺钎釾䥺鈀钯鈁钫鈃钘鈄钭鈈钚鈉钠鈍钝鈎钩鈐钤鈑钣鈒钑鈔钞鈕钮鈞钧鈣钙鈥钬鈦钛鈧钪鈮铌鈰铈鈳钶鈴铃鈷钴鈸钹鈹铍鈺钰鈽钸鈾铀鈿钿鉀钾鉅钜鉈铊鉉铉鉋铇鉍铋鉑铂鉕钷鉗钳鉚铆鉛铅鉞钺鉢钵鉦钲鉨鿭鉬钼鉭钽鉶铏鉸铰鉺铒鉻铬鉿铪銀银銃铳銅铜銍铚銑铣銓铨銖铢銘铭銚铫銛铦銜衔銠铑銣铷銥铱銦铟銨铵銩铥銪铕銫铯銬铐銱铞銳锐銷销銹锈銻锑銼锉鋁铝鋃锒鋅锌鋇钡鋌铤鋏铗鋒锋鋙铻鋝锊鋟锓鋣铘鋤锄鋥锃鋦锔鋨锇鋩铓鋪铺鋭锐鋮铖鋯锆鋰锂鋱铽鋶锍鋸锯鋼钢錁锞錄录錆锖錇锫錈锩錏铔錐锥錒锕錕锟錘锤錙锱錚铮錛锛錟锬錠锭錡锜錢钱錦锦錨锚錩锠錫锡錮锢錯错録录錳锰錸铼鍀锝鍁锨鍃锪鍆钔鍇锴鍈锳鍋锅鍍镀鍔锷鍘铡鍚钖鍛锻鍠锽鍤锸鍥锲鍩锘鍬锹鍰锾鍵键鍶锶鍺锗鎂镁鎄锿鎇镅鎊镑鎔镕鎖锁鎘镉鎛镈鎡镃鎢钨鎣蓥鎦镏鎧铠鎩铩鎪锼鎬镐鎮镇鎰镒鎲镋鎳镍鎵镓鎶鿔鎸镌鎿镎鏃镞鏈链鏌镆鏍镙鏐镠鏑镝鏗铿鏘锵鏜镗鏝镘鏞镛鏟铲鏡镜鏢镖鏤镂鏨錾鏰镚鏵铧鏷镤鏹镪鏺䥽鏽锈鐃铙鐋铴鐐镣鐒铹鐓镦鐔镡鐘钟鐙镫鐝镢鐠镨鐥䦅鐦锎鐧锏鐨镄鐮镰鐯䦃鐲镯鐳镭鐵铁鐶镮鐸铎鐺铛鐿镱鑄铸鑈鿭鑊镬鑌镔鑒鉴鑔镲鑕锧鑞镴鑠铄鑣镳鑥镥鑭镧鑰钥鑱镵鑲镶鑷镊鑹镩鑼锣鑾銮鑿凿钁䦆钂镋長长門门閂闩閃闪閆闫閈闬閉闭閌闶閎闳閏闰閑闲閒闲間间閔闵閘闸閡阂閣阁閥阀閨闺閩闽閫阃閬阆閭闾閱阅閲阅閶阊閹阉閻阎閼阏閽阍閾阈閿阌闃阒闈闱闊阔闋阕闌阑闍阇闐阗闒阘闓闿闔阖闕阙闖闯關关闞阚闠阓闡阐闤阛闥闼阪坂陘陉陝陕陣阵陰阴陳陈陸陆陽阳隉陧隊队階阶隕陨際际隨随險险隯陦隱隐隴陇隸隶隻只雋隽雖虽雙双雛雏雜杂雞鸡離离難难雲云電电霢霡霧雾霽霁靂雳靄霭靆叇靈灵靉叆靚靓靜静靦䩄靨靥鞀鼗鞏巩鞝绱鞦秋鞽鞒韁缰韃鞑韉鞯韋韦韌韧韍韨韓韩韙韪韜韬韞韫響响頁页頂顶頃顷項项順顺頇顸須须頊顼頌颂頎颀頏颃預预頑顽頒颁頓顿頗颇領领頜颌頡颉頤颐頦颏頭头頮颒頰颊頲颋頴颕頷颔頸颈頹颓頻频頽颓顆颗題题額额顎颚顏颜顒颙顓颛顔颜顙颡顛颠類类顢颟顥颢顧顾顫颤顬颥顯显顰颦顱颅顳颞顴颧風风颭飐颮飑颯飒颳刮颶飓颸飔颺飏颻飖颼飕飀飗飄飘飆飙飈飚飛飞飠饣飢饥飣饤飥饦飩饨飪饪飫饫飭饬飯饭飲饮飴饴飼饲飽饱飾饰飿饳餃饺餄饸餅饼餉饷養养餌饵餎饹餏饻餑饽餒馁餓饿餕馂餖饾餛馄餜馃餞饯餡馅館馆餳饧餶馉餷馇餺馎餼饩餾馏餿馊饁馌饃馍饅馒饈馐饉馑饊馓饋馈饌馔饑饥饒饶饗飨饜餍饞馋饢馕馬马馭驭馮冯馱驮馳驰馴驯馹驲駁驳駐驻駑驽駒驹駔驵駕驾駘骀駙驸駛驶駝驼駟驷駡骂駢骈駭骇駰骃駱骆駸骎駿骏騁骋騂骍騅骓騌骔騍骒騎骑騏骐騖骛騙骗騤骙騧䯄騫骞騭骘騮骝騰腾騶驺騷骚騸骟騾骡驀蓦驁骜驂骖驃骠驄骢驅驱驊骅驌骕驍骁驏骣驕骄驗验驚惊驛驿驟骤驢驴驤骧驥骥驦骦驪骊驫骉骯肮髏髅髒脏體体髕髌髖髋髮发鬆松鬍胡鬚须鬢鬓鬥斗鬧闹鬩阋鬮阄鬱郁鬹鬶魎魉魘魇魚鱼魛鱽魢鱾魨鲀魯鲁魴鲂魷鱿魺鲄鮁鲅鮃鲆鮊鲌鮋鲉鮍鲏鮎鲇鮐鲐鮑鲍鮒鲋鮓鲊鮗鿴鮚鲒鮜鲘鮝鲞鮞鲕鮣䲟鮦鲖鮪鲔鮫鲛鮭鲑鮮鲜鮳鲓鮶鲪鮺鲝鯀鲧鯁鲠鯇鲩鯉鲤鯊鲨鯒鲬鯔鲻鯕鲯鯖鲭鯗鲞鯛鲷鯝鲴鯡鲱鯢鲵鯤鲲鯧鲳鯨鲸鯪鲮鯫鲰鯰鲶鯴鲺鯷鳀鯽鲫鯿鳊鰁鳈鰂鲗鰃鳂鰆䲠鰈鲽鰉鳇鰌䲡鰍鳅鰏鲾鰐鳄鰒鳆鰓鳃鰛鳁鰜鳒鰟鳑鰠鳋鰣鲥鰥鳏鰧䲢鰨鳎鰩鳐鰭鳍鰮鳁鰱鲢鰲鳌鰳鳓鰵鳘鰷鲦鰹鲣鰺鲹鰻鳗鰼鳛鰾鳔鱂鳉鱅鳙鱈鳕鱉鳖鱒鳟鱔鳝鱖鳜鱗鳞鱘鲟鱝鲼鱟鲎鱠鲙鱣鳣鱤鳡鱧鳢鱭鲚鱯鳠鱸鲈鱺鲡鳥鸟鳧凫鳩鸠鳬凫鳲鸤鳳凤鳴鸣鳶鸢鳾䴓鴆鸩鴇鸨鴉鸦鴒鸰鴕鸵鴛鸳鴝鸲鴞鸮鴟鸱鴣鸪鴦鸯鴨鸭鴯鸸鴰鸹鴴鸻鴷䴕鴻鸿鴿鸽鵁䴔鵂鸺鵃鸼鵐鹀鵑鹃鵒鹆鵓鹁鵜鹈鵝鹅鵠鹄鵡鹉鵪鹌鵬鹏鵮鹐鵯鹎鵲鹊鵷鹓鵾鹍鶄䴖鶇鸫鶉鹑鶊鹒鶓鹋鶖鹙鶘鹕鶚鹗鶡鹖鶥鹛鶩鹜鶪䴗鶬鸧鶯莺鶲鹟鶴鹤鶹鹠鶺鹡鶻鹘鶼鹣鷀鹚鷁鹢鷂鹞鷄鸡鷈䴘鷉䴘鷊鹝鷓鹧鷖鹥鷗鸥鷙鸷鷚鹨鷥鸶鷦鹪鷫鹔鷯鹩鷲鹫鷳鹇鷸鹬鷹鹰鷺鹭鷽鸴鸂㶉鸇鹯鸊䴙鸌鹱鸏鹲鸕鸬鸘鹴鸚鹦鸛鹳鸝鹂鸞鸾鹵卤鹹咸鹺鹾鹼硷鹽盐麗丽麥麦麩麸麴麹麵面麼么麽么黃黄黌黉點点黨党黲黪黴霉黶黡黷黩黽黾黿鼋鼂鼌鼉鼍鼕冬鼴鼹齊齐齋斋齎赍齏齑齒齿齔龀齕龁齗龂齙龅齜龇齟龃齠龆齡龄齦龈齪龊齬龉齲龋齶腭齷龌龍龙龎厐龐庞龑䶮龔龚龕龛龜龟鿁䜤鿐䲤鿓鿒鿠鿟鿳鿸"],
  [1,3,"㑮𫝈㒓𠉂㒖𮯵㒜𠇐㒣𬾖㒿𰖩㓄𪠟㓖𰃻㔃𫦌㔅𫦅㔋𪟎㔝𫦩㔢𫦳㕒𰆕㕢𰇀㖦𰇎㖮𪠵㗙𫩩㗢𰇖㗣𫪺㗰𫩛㗲𠵾㗶𭇜㗻𫪀㗼𫩤㗿𪡛㘓𪢌㘔𫬐㘖𰉁㘙𫪂㘤𡈛㙔𰉘㙡𭎂㙢𰊟㙬𫮜㙺𰊛㙾𰉽㛍𮰿㛝𫝦㜐𫝧㜕𮱇㜗𡞋㜞𰌆㜢𡞱㜥𫰨㜭𫰠㜮𫱕㜰𮰽㜷𡝠㜺𫲗㝞𫳃㝟𫤸㞞𪨊㟦𮱩㟺𪩇㠁𫶅㠆𮱯㠠𰎐㠣𫵷㡓𫷅㡞𰏜㢗𪪑㢝𢋈㤲𫺁㥷𰑸㦊𫺆㦎𢛯㦖𫺓㦛𢗓㦞𪫷㦡𮲃㦦𫻁㦬𰑫㦭𭝋㨛𰓔㨟𫼥㨥𫽀㨻𪮃㩇𫽇㩋𪮋㩌𫽧㩣𫾉㩭𫽊㩷𰔲㩹𢶣㪎𪯋㪹𬖠㬢𮲛㬣𬀮㬮𰖠㮓𣕲㮝𣒗㮲𰗙㮿𮲰㯂𰘀㯆𰗡㯤𣘐㯸𰗦㯼𣙥㰂𰗵㰄𮲶㰅𭫙㰍𬺜㰰𬅢㰳𭭈㲯𰚪㲰𰚔㲲𬇇㴸𰛛㴿𰛽㵍𬇰㵑𰜢㵒𬈕㵗𣳆㵤𬉇㵾𪷍㶆𫞛㶌𣾍㶍𰝟㶏𰝋㶒𰛩㶕𰝗㷃𰝾㷍𤆢㷲𰞉㷶𰞲㷻𭴊㷿𤈷㸅𰞍㸊𬋍㸐𬊾㹓𰠴㹽𫞣㺏𤠋㺑𬌷㺜𪺻㻶𪼋㼀𮴘㼁𮴂㼆𬎆㼈𭹜㼻𬎧㾵𬏟㾺𬏜㿉𰣶㿎𬏷㿖𪽮㿗𤻊㿧𤽯㿹𰤨䀉𥁢䀍𰥊䀴𬑏䀹𥅴䁝𰥞䁪𥇢䁱𬑒䂎𥎝䂓𰦔䃁𰦴䃕𰦷䃘𬒎䃢𰧎䃣𰦨䃤𬒕䃴𰧘䅐𫀨䅘𥟂䅳𫀬䆅𰨳䆉𫁂䇓𰩧䉆𮵮䉍𬕊䉐𬕛䉑𫁲䉙𥬀䉬𫂈䉱𬕦䉲𥮜䉶𫁷䊜𰪫䊟𰫋䊭𥺅䊲𬡻䊵𮉠䊺𫄚䋃𫄜䋆𰬁䋍𰬂䋎𬘜䋏𮉣䋐𬘙䋑𰬃䋔𫄞䋦𫄩䋫𰬑䋺𬘴䋼𫄮䋽𰬭䋾𬘲䋿𦈓䌁𬘱䌇𰬱䌈𦈖䌋𦈘䌌𰬶䌐𬘮䌖𦈜䌝𦈟䌞𬘪䌟𦈞䌥𦈠䌪𬙁䌰𦈙䍤𫅅䍷𬙭䍽𦍠䎘𬚄䎙𫅭䏊𰭹䐢𰮙䐣𬁽䐷𬂅䐹𰮲䐽𰯎䑗𬛹䑼𰰌䓣𬜯䔇𰰴䔈𰱀䔡𬝁䕏𮶝䕡𰱩䕤𫟕䕳𦰴䕹𰰶䕼𬝴䖀𰲖䖅𫟑䖚𰲟䗃𰲳䗅𫊪䗥𰲯䗻𮔂䗽𰳚䗿𧉞䙔𫋲䙱𧜭䙼𰴖䚆𬢑䚉𬢐䚕𰴗䚞𰴤䚩𫌯䚳𬣛䚵𬣟䚽𬣜䛀𰵐䛄𫍠䛌𰵜䛍𬣧䛘𬣯䛛𬣬䛞𬣸䛠𰵫䛤𬣹䛬𬤁䛭𰵰䛳𫍫䛴𮷈䛽𬤌䛿𬤑䜄𰶈䜉𬤘䜋𬤉䜍𬤟䜎𬣿䜏𰶇䜒𬤡䜖𫟢䜚𬤪䜝𬤬䝏𰶬䝕𬥄䝭𫎧䝯𬥵䝻𧹕䞀𬥽䞁𬥺䞂𬥻䞈𧹑䞉𰷩䞋𫎪䞓𫎭䟃𫎺䟆𫎳䟏𰷴䟐𫎱䟺𬦥䠆𫏃䠟𰸈䠠𰸛䠩𰸊䠮𬧃䠱𨅛䡁𬧢䡄𮷖䡅𰹳䡇𰹷䡊𰹺䡐𫟤䡗𬨆䡘𬨉䡝𰺑䡟𬨌䡦𬨑䡩𫟥䡰𰺘䡴𰺝䡵𫟦䡶𬨔䡷𰺡䡻𰺤䡾𰺠䢈𰺭䢨𨑹䤌𮠞䤍𰼑䤠𰽠䤤𫟺䤥𰽺䤨𰽸䤩𬭈䤪𬭆䤬𰾈䤭𮸌䤵𰾐䤸𰾦䤻𰾖䤼𬭣䥄𫠀䥓𮸞䥕𬭯䥖𰾻䥗𫔋䥛𬭴䥝𰿁䥞𬭻䥩𨱖䥯𫔆䥴𰿅䥶𰽝䥷𰿇䥸𨧮䦌𮤬䦎𰿨䦖𮸥䦘𨸄䦝𬮨䦣𮸦䦪𰿴䦯𫔵䦱𰿫䦳𨷿䧞𬮺䧢𨸟䨴𱁒䩤𮸮䩫𬰥䪊𫖅䪍𱁽䪏𩏼䪐𱂅䪓𬰳䪗𩐀䪘𩏿䪜𬰷䪝𱂌䪥𱂎䪴𫖫䪼𱂢䪾𫖬䫀𫖱䫂𫖰䫈𬱣䫉𬥈䫌𱂮䫏𬱦䫐𬃲䫜𬱮䫟𫖲䫠𬱰䫥𱆚䫩𬱬䫴𩖗䫶𫖺䫻𫗇䫼𬱷䫾𫠈䬀𱃖䬂𬱸䬅𱃚䬍𬲀䬎𬱿䬐𱃜䬓𫗊䬔𱃞䬘𩙮䬝𩙯䬞𩙧䬟𱃙䬣𱃱䬧𫗟䬪𱃳䬫𬲮䬬𱃵䬯𬲫䬲𬲯䬳𱃷䬶𬲷䬹𱃸䬾𬲻䭀𩠇䭃𩠈䭅𬲾䭇𬳀䭈𱄃䭉𬳅䭑𫗱䭒𬳋䭓𱃹䭔𫗰䭕𬲕䭘𬳑䭞𬲳䭡𱄉䭢𬲲䭣𬲶䭭𬱯䭿𩧭䮂𱅄䮄𫠊䮈𬳾䮗𬴁䮝𩧰䮞𩨁䮠𩧿䮧𱅠䮫𩨇䮰𫘮䮲𱅦䮳𩨏䮸𬳸䮽𬴍䮾𩧪䮿𬴏䯤𩩈䰎𱆃䰐𱆅䰖𱆈䰫𱆙䰲𱇍䰷𬶆䰻𱇕䰽𱇑䱀𫚐䱁𫚏䱂𱇤䱅𱇚䱇𱇞䱌𱇬䱍𬶊䱎𱇥䱐𱇲䱒𱇰䱓𬶓䱗𮬞䱙𩾈䱚𮬠䱛𮬟䱜𱇷䱟𱈀䱡𱇽䱤𱇻䱥𱇹䱧𫚠䱬𩾊䱭𱈇䱰𩾋䱱𬶤䱴𱈈䱵𮬢䱸𫠑䱹𬶣䱻𮬡䱾𱈆䲅𫚜䲉𱈒䲏𬶗䲕𬶴䲖𩾂䲗𮬣䲙𬶎䲚𱈖䲛𱈛䲨𬷾䲰𪉂䲸𮭡䲹𱉖䲼𬸆䳅𱉙䳇𱉞䳍𮭥䳏𱉤䳒𱉧䳓𱉦䳕𱉺䳚𱉶䳜𫛬䳟𱊂䳢𫛰䳤𫛮䳥𮹗䳧𫛺䳨𬸛䳫𫛼䳭𱉼䳮𱊓䳲𱊙䳺𱊣䳽𮹙䴇𱊪䴈𬸩䴋𫜅䴏𮹜䴚𮭰䴝𱊼䴬𪎈䴭𬹅䴮𱋆䴱𫜒䴲𱋊䴳𱋎䴴𪎋䴵𱋔䴷𬹉䴸𱋗䴹𱋙䴺𱋝䴽𫜔䵂𱋪䵃𱋫䵆𱋮䵐𱋴䵘𬓸䵳𪑅䵴𫜙䵶𱌁䵷𱌃䶕𫜨䶗𮯙䶢𬺍䶣𬺃䶦𬺉䶧𱌰䶨𱌵䶪𬺕䶱𱍇䶲𫜳俓𠇹偩𰁾傪𫢺傱𰁧僀𰂗僆𫢪働𫢙僓𰂜僗𫢬僤𫢸僩𰂎僴𰂋僾𫣊儅𰁸儖𫣉儢𰂦儣𠆲儥𰂏儩𰂭儮𮯸儰𫢭儱𫢒儹𰃆凔𰃷凙𪞝凟𰃿凴𮰉剸𰄞剾𠛅劗𭄛勑𠡠勣𪟝勴𰅔匰𰅦匵𰅥卨𫧯厱𰆚哯𠯟唊𰇕唓𪠳唻𫪁喡𮰔嗧𰇠嗹𪡏嗿𰇲嘄𫪧嘇𰇼嘪𪡃嘳𪡞嘺𪡀噅𠯠噞𪡋嚂𰈓嚈𫩫嚍𫩺嚐𰈇嚛𪠸嚝𫩕嚠𭇯嚧𠰷嚩𰈶嚪𫫦嚫𰈍嚬𫫾嚱𰇣嚸𰈊嚽𪢕嚿𫩥囃𠱞囇𫪃囋𰉄囐𰈯囒𪢠囕𰈆圞𪢮垷𰉚埉𰉥埨𫭢埬𪣆堈𰉙堚𪣒塸𫭟塼𫭞塿𪣻墆𰊂墋𫮅墏𰊈墝𫭪墠𫮃墢𫭨墧𰉩墷𰉪墿𰉣壈𡒄壍𰊢壏𰊑壐𡊑壒𭏦壔𭎜壗𡋤壛𰊡壝𭏸壣𪤚壧𫭲奫𫯶奯𫯥奲𫰂娙𫰛婡𫝫婸𰋸媁𫰍媈𫝨媜𰌂嫈𰌀嫢𫰹嫥𰋹嫧𰌇嬅𫰡嬇𫝬嬐𫰰嬒𫰢嬝𮱒嬟𮰸嬣𪥰嬦𫝩嬧𮱁嬮𰋽嬻𪥿嬾𰌙孄𫝮孆𫝭孇𪥫孎𡠟孏𮰾孲𰌦孻𡥧孾𪧀寠𪧘寪𰌷寷𫲸屩𪨗崙𪨧崠𰎏崱𰎖崵𫵵嵷𰎌嵸𡵝嵼𡶴嵽𫶇嶈𡺃嶤𰎔嶩𰎞嶪𰎑嶹𫝵嶽𰎫巃𰎎巆𫶕巊𪩎巑𰏁巖𰎠巗𪨷巘𪩘巚𰎹巠𢀖帴𰏕幠𭘓幩𪩸幰𫷉幱𰏟庲𫷬廔𫷹廕𫷮廗𰏼廞𫷷廥𰏶廧𪪞廮𫷾彄𫸩彍𭚦徿𪫌悏𫺂悓𮲁惀𰑄愇𫹴愩𫺌慐𰑟慖𮲇慙𰑧慯𫹽慱𰑁慲𰒆慸𰑵慹𰑔憅𮲄憢𢙒憦𫺘憪𰑥憴𰑪憸𪫺憹𢙐懀𢙓懓𭞄懕𰑕懘𰒒懙𫹮懜𢟼懠𫺊懩𫺪懫𰑬懭𰐾懰𰑙戁𫺷戃𰑿掁𰓄掚𪭵搊𫼝搎𰓧摀𰓆摃𫼱摋𢫬摐𪭢摕𰔇摙𫽁摪𫽣摫𰓻摲𰓼摼𰓱撊𪭾撋𰓷撌𰔋撧𪮖撶𫼧擃𫼮擈𭠙擟𪭧擣𢭏擧𢪓擪𰓙擫𢬍擳𰓜攋𪮶攎𢫘攑𫽥攞𫽋攦𰓬攧𭣇攩𫽮攳𰕁敳𮲔敺𰕅敿𰕈斁𭣧斄𭤎斅𢽾斸𣃁旝𰕭旟𭤰昜𠃓晛𬀪暊𮲟暐𬀩暟𬀱曊𪰶曥𣆐曭𭧋曮𰖈朥𦛨桱𣐕梖𪱷梜𬂩棆𰗖椚𭩛楇𣒌楎𰗢榝𬂮榯𰗨槫𣏢槻𬃀樠𣗊樲𬃘樻𭫀橃𭩰橅𬂠橚𰗹橨𰗺橯𣓿檂𬂰檋𰘈檒𮨴檛𭪆檡𰗛檥𭩚檭𣘴檰𰘣檲𣑝檵𪲛檾𰘓檿𰗜櫅𪲎櫍𬃊櫎𰗓櫏𰗬櫠𪲮櫢𰘸櫦𮲲櫩𰘠櫯𰘶櫴𰘳櫶𬃫櫹𰘩櫽𬄩欆𮲮欇𪳍欍𣐤欐𪲔欑𪴙欓𣗋欘𣚚歄𬅥歍𰙋歕𬅫歗𰙑歛𰙎歞𪴯殢𣨼毄𬆦毊𪵑毚𫥎氀𰚦氭𣱝浿𬇙涷𰛒湋𣲗溡𪶄溤𰛊溰𰛥滭𰛡漍𬇹漎𰛏漐𰛣漙𬇘潕𣲘潣𫞗潬𬈁澅𣶩澒𭱊澕𮳆澖𰛵澢𭰎澫𬇕澬𫞚澰𰛲濆𣸣濇𬈧濊𰛦濴𬈜濿𪵱瀁𰜝瀃𣽷瀄𰛤瀈𰝍瀗𮳏瀙𰜜瀢𬉋瀭𮳗瀯𰝅瀳𰜨瀴𰜳瀵𬉂灍𫞝灒𪷽灓𰛪灙𣺼灟𭲫灠𰜐灦𰝤焛𬮟煇𪸩煈𮳠煼𬊂熂𪸕熉𤈶熌𤇄熓𤆡熕𬊎熞𰞤熡𤋏熰𬉼燀𬊤燆𮳧燌𰞻燖𬊈燘𬊖燡𰞇燰𬊺燵𬊉燽𬊍爁𬊶爃𫞡爄𤇃爓𰟘爖𤇭爗𮳴爣𬊵爥𪹳爧𫞠牋𰠛牼𰠲犅𰠫犓𬌝犞𪺭犤𰠹猌𪺽猍𰡎猧𰡏獊𪺷獑𰡔獖𰡞獟𬌮獢𰡊獩𤞃獹𰡄玁𤞤玂𰡩珼𫞥琖𬍙瑙𰡻瑻𪻲瑽𪻐璊𫞩璍𮴔璕𬍤璗𬍡璛𰢄璝𪻺璹𰡽璼𫞨璾𫞦瓄𪻨瓅𬍛瓐𰡵瓓𬎑瓕𤦀瓛𤩽甊𰢦甒𰢢甖𰢤痮𪽪瘑𬏮瘒𬏫瘱𪽷癈𬏦癎𰣯癐𤶊癠𰣬癪𰣼癴𰣽皟𤾀皪𰤕皾𰤬盨𪾔睍𪾢睔𬑆睪𠬤睴𬑕瞓𰥛瞛𰥒瞡𰥪瞤𥆧瞯𰥨瞱𬑓瞷𬑗矉𪾸矊𬑧矑𪾦矕𰥠矖𰥢矘𰥹矲𰦜碙𥐻碢𰦿磒𬒍磱𮀤磵𰧃礋𰦰礏𬒆礐𬒈礒𥐟礚𥕤礛𰧔礥𰧇礩𰧉礮𪿫礰𰦦礲𰦭礹𰦾禓𰧰禜𰱈禬𰧻禯𰧾禵𰨖稦𮵠穖𬓠穧𰨦穨𬓼穬𰨜窱𰩏竀𰩓竉𰩅竱𫁟箂𮵱箹𰩺篘𥬠篢𬕂篵𥬈篸𥮾篿𰩮簂𫂆簜𰩹簢𫂃簥𰩸簵𰪏簻𰩻籋𥬞籚𰩲籣𮆏籦𰪊籫𬖃籭𬕄籯𰪣粯𬖑粻𰪭糮𬖮糷𰫖糺𫄙糽𰫼紁𮵿紃𬘓紌𬘕紑𰫽紒𰬀紞𬘘紟𫄛紨𰬅紩𮉢紭𰬋紶𬘛紸𰬇紽𰬉紾𬘝絁𫄟絃𰬈絇𰬆絍𫟃絑𰬏絓𮉤絖𬘢絘𰬒絙𫄠絚𰬌絟𬘥絠𬘠絣𰬔絤𬘟絥𫄢絧𫄡絪𬘡絯𰬓絸𬘖絺𫄨絻𰬜絼𰬛絽𬘤絾𰬖絿𰬗綀𦈌綄𬘫綅𰬞綇𦈋綊𰬍綋𫟄綍𰬘綎𬘩綕𬘨綖𫄧綘𮶂綝𬘭綟𫄫綡𫟅綧𬘯綪𬘬綷𮉬綼𰬤緀𰬢緁𰬡緂𰬧緅𮉪緆𰬣緉𮉧緌𮉫緍𦈏緎𰬟総𰬥緛𬘰緟𫟆緢𰬬緤𫄬緧𬘶緪𬘵緫𰬰緮𫄭緰𦈕緵𰬯緷𦈉緸𦈑緺𮉨縌𰬳縍𫄰縎𦈔縒𬘷縓𰬲縖𬘻縚𬘺縜𰬚縡𰬴縩𮉯縪𰬎縬𦈚縯𬙂縰𫄳縸𫄲縺𦈐縼𰬵縿𰬪繀𮉮繂𫄴繈𫄶繎𬙇繏𦈝繐𰬸繑𰬐繓𦈛繖𰬷繗𬙈繘𰬻繙𬙆繜𰬺繟𦈎繣𰬠繨𫄤繬𫄱繲𰬽繵𬙉繶𫄷繷𫄣繻𦈡纀𰬿纁𫄸纃𬘧纆𬙊纋𰭀纑𮉡纕𬙋纗𫄹纚𫄥罆𰭄罏𬙎罼𬙝羂𰭔羵𫅗翜𰭢翿𰭣聻𫆏脥𣍰腪𣍯膒𬁵膢𦝼膮𰮝膴𰮇膶𬂀膷𰮅膹𪱥臗𣎑臡𰯋艛𰰑艜𰰏艭𰰋菕𰰨萯𰰷葝𫈎葻𬜥蒍𫇭蒒𰰳蒭𫇴蒳𰱌蒶𰱍蓲𰰤蔄𬜬蔎𰰺蔠𰱛蔪𰱑蔮𬜿蔯𫈟蔱𰰵蔿𫇭蕄𰱉蕑𰱇蕝𫈵蕟𬜧蕡𰱟蕧𰱦蕳𫈉蕽𫇽薆𫉁薉𬜨薋𰱱薖𰰾薠𮐚薱𰰱薲𬝯藇𰰠藖𬜾藘𰱮藚𰱐藣𰱯藬𬞘藰𰰹藷𫉄藾𰱾蘈𰲁蘟𦻕蘡𮐨蘫𬞫蘬𰰮蘱𰲒蘵𰱲蘹𬜸虅𰲂虉𬟁虦𰲠蛵𰲶蛼𰲬蜦𰲰蜸𰲮蜽𮔊蝀𬟽蝁𰲸蝜𮔅螘𰲹螴𰳄螹𰳂蟂𫋇蟘𫋌蟜𫊸蟡𰲲蟦𰳊蟱𰲫蟳𫊻蟷𬠅蟽𰲻蠀𧏗蠈𬠠蠌𰲵蠒𫊱蠙𧏖蠞𬝋蠦𫊮蠪𰲴蠳𰳗蠾𧑏裌𬡒裲𮖁褭𬡇褺𬡓襀𫌀襂𰴂襓𫋹襗𫋷襘𫋻襛𰳺襨𰳸襭𮖱襰𧝝襱𰳲襵𫌇襸𬡷襹𰳼襼𰳵覒𬆾覕𰴕覗𬢊覛𫌪覜𬢋覟𬢌覠𰴙覢𬊦覤𬟪覩𬢎覭𬢒覮𲁖覰𰴜覴𬢔覶𰴝覸𰴘覹𫌭覻𰴞覼𫌨觷𰴣觹𧤤觻𰴢觽𧥅訆𰵊訏𬣙訑𫍙訜𫍛訞𫍚訦𰵒訧𰵎訨𫟞訬𰵏訰𰵍訸𰵝訹𰵓訽𰵛詀𧮪詃𬣤詄𰵙詅𰵚詇𰵗詉𰵠詊𫟟詌𬣠詍𰵔詏𬣦詑𫍡詓𫍜詜𬣥詝𬣞詥𰵣詨𰵦詪𬣳詯𬣰詴𬣩詶𬣱詷𫍣詺𬣮詻𰵤誁𬣲誂𫍥誃𰵥誋𫍪誎𬣷誏𬣼誐𰵮誔𬣻誗𰵭誙𰵡誜𰵯誧𰵩誫𫍨誳𫍮誴𫟡誷𫍬誺𫍧誻𰵸誽𰵵諁𰵷諃𰵱諆𰵲諈𰵶諌𮷅諎𬣾諓𬣡諔𰵴諕𬤀諟𬤊諠𬤎諣𫍩諥𫍳諯𫍱諰𫍰諲𬤇諴𫍯諹𰵌諻𬤍謆𫍸謉𫍷謋𰵼謌𬤐謍𰴯謏𫍲謑𰵾謜𰵺謞𰵿謟𰵽謣𰶀謥𰶂謯𫍹謰𬣽謱𫍴謴𬤆謵𰶃謸𫍵謻𰶁謼𬤙譀𰶆譂𫟠譄𬤤譅𰶎譆𫍻譇𰶄譈𬤣譊𫍢譌𰵑譐𬤢譑𫍤譒𮷊譓𬤝譔𬤥譞𫍽譟𬤨譠𰶉譡𬣭譨𫍦譩𰶊譳𰶌譹𬤫譺𬤩譻𬢯譿𬤭讂𰶍讆𬣀讇𬤛讉𬤦讑𰶏讔𮙊讘𰵹讙𬤰讚𬤮讛𰵖讝𰵨讟𮙋豄𰶔豅𰶑豵𫎆貗𫎌貣𰷞貤𰷠貦𰷡貱𬥶貾𰷢賗𬥸賝𫎩賟𧹖賥𰷤賨𰷥賮𰷧賶𬥳賸𬂉賹𰷪贃𧹗贆𰷫贉𫎫贑𫎬贕𫧿贙𰷮贚𫎦趫𰷶趬𰷵踚𬦧蹔𫏐蹛𰸚蹡𬧀蹥𰸔蹪𰸞蹳𫏆蹻𫏋躀𬦻躘𨀁躝𨅬躧𰸐軂𬧤軃𰹀軇𮜶軉𨉗軎𰹲軏𫐄軓𰹴軕𫐅軖𰹶軗𨐅軘𰹸軚𮷗軜𫐇軝𬨂軞𬨁軥𰺁軧𰺀軨𫐉軬𫐊軮𬨄軯𰹽軱𮝴軳𰺂軵𰹿軷𫐈軿𫐌輀𮝵輁𰺄輂𰺅輄𨐈輆𬨇輋𪨶輐𰺇輑𰺈輖𫐏輗𫐐輘𰺊輙𰺋輚𰹼輠𰺍輡𰺐輢𫐎輣𰺏輤𰺉輨𫐑輫𰺎輮𫐓輲𰺒輴𮝸輵𬨍輶𬨎輷𫐒輹𰺓轁𮷝轃𰺖轇𫐖轈𬨓轊𫐕轏𰺞轐𫐗轑𰺛轒𮝷轓𰺜轕𮝺轖𰺙轗𫐘轘𮝹轙𰹵轚𰺟轛𰺃轝𬛼轞𰺗轠𫐙轣𫐆轥𰺣逿𰺲遰𰻆遱𫐷遶𰺷郲𬩾鄟𫑘鄡𰻮鄦𰻡鄩𬩽鄪𰻳鄬𰻦鄮𬪍鄳𫑡醆𬪨醦𮠳醧𬪧醲𬪩醳𰼅醶𫑷釚𫟲釛𰽖釟𫓥釥𰽛釦𬬪釨𫓦釪𰽗釫𬬨釬𬬧釭𮣲釱𰽘釲𫟳釳𨰿釴𬬩釽𬬲釿𬬱鈂𬬵鈆𫓪鈇𫓧鈋𨱂鈏𰽣鈓𬬯鈖𫟴鈗𫟵鈚𬬫鈛𫓨鈜𮣳鈠𨱁鈤𰽡鈨𮷸鈪𰽞鈯𨱄鈲𨱃鈵𰽥鈶𬭀鈼𬬽鉁𨱅鉊𬬿鉌𰽬鉎𰽫鉏𬬺鉐𬬷鉒𰽯鉔𫓬鉘𰽱鉙𰽨鉜𰽮鉝𫟷鉟𰽧鉠𫓭鉡𰽰鉥𬬸鉧𬭁鉮𬬹鉲𰽩鉵𰽶鉷𫟹鉹𰽹鉼𰽼鉽𫟸鉾𫓴銁𫓲銂𫟻銈𫓯銊𫓰銋𰽻銏𫟶銔𬭃銗𬭅銙𰽴銡𰽲銧𰽵銲𬭍銶𨱇銸𰽿銾𰾁鋂𰾄鋉𨱈鋊𰾆鋋𮣴鋍𰾀鋐𬭎鋑𮸏鋓𮸊鋗𫓶鋘𬭌鋜𰾃鋠𫓵鋡𰾅鋧𰽢鋹𬬮鋾𰾏錀𬬭錂𨱋錋𬭖錍𰾎錑𬭜錔𰾓錗𬭗錜𫓻錝𫓽錞𬭚錣𮣵錤𫓹錥𫓾錧𰾒錪𬭓錭𬭕錺𮸐錽𫓸鍂𰾑鍄𨱉鍉𫔂鍊𫔀鍏𬬬鍐𰾞鍑𰾟鍒𫔄鍕𮸈鍖𰾘鍜𰾤鍝𰾙鍟𰾝鍡𰾚鍢𮸕鍣𬭡鍦𰾢鍧𰾡鍨𰾥鍭𬭤鍮𨱎鍯𬭥鍱𰾕鍴𰾜鍼𰾗鎅𰾛鎈𫟿鎉𰾬鎋𬭪鎌𰾮鎍𫔅鎑𰾩鎒𬭦鎓𬭩鎕𰾯鎗𬬰鎙𫔈鎚𬭨鎝𨱏鎞𫔇鎯𨱍鎷𨰾鏁𬭲鏂𰽜鏆𨱌鏉𨱒鏏𬭬鏒𬭝鏓𰾱鏔𬭰鏕𰾲鏙𰾰鏚𬭭鏛𮸟鏥𫔊鏦𫓩鏩𰾌鏸𰾶鏻𬭸鏾𫔌鐀𬭢鐁𰾴鐄𨱑鐇𫔍鐈𫓱鐉𰾼鐊𬭏鐍𫔎鐎𨱓鐏𨱔鐕𰾷鐖𰽕鐚𰾪鐤𰾸鐩𬭼鐪𫓺鐬𰽷鐴𬭽鐹𰽾鐼𫔁鐽𫟼鑀𰾭鑇𬭉鑉𫠁鑋𰼻鑏𬬾鑐𰿂鑑𰾫鑖𰿃鑘𰿄鑙𬭿鑛𰽚鑡𬭔鑢𮣶鑧𮸠鑨𰽦鑪𬬻鑮𬮁鑯𰿈鑴𫔔鑸𰿉钀𰾾钃𰾽閄𬮘閅𮤫閍𨸂閐𨸃閕𰿩閗𫔯閛𰿬閜𬮠閝𫠂閞𫔰閟𮤲閦𬮥閧𬮢閯𬮪閵𫔴閷𰿳闄𬮲闇𬮴闉𬮱闑𫔶闚𬮭闛𰿺闟𰿻陿𬯅隑𬮿隖𬮻隤𬯎隫𱀡隮𬯀隲𱀑霣𫕥霼𪵣靅𰷦靧𫖃鞸𱁴鞻𱁺鞼𱁹鞾𫖇韇𱁷韊𱁾韏𱂇韐𱂆韒𱂉韔𮧴韗𱂈韘𱂊韚𫠅韛𫖔韝𫖕韠𫖒韡𮧵韢𬰶韣𱂋頄𬱓頍𫠆頔𬱖頕𬱗頖𬱙頛𬱜頞𱂨頟𱂥頠𬱟頢𬱠頩𱂦頪𱂧頫𫖯頯𱂬頵𫖳顀𱂭顁𬱫顃𩖖顄𱂰顅𫖶顇𱂯顉𰽳顊𬱪顋𱂲顐𬱢顑𱂱顖𱂶顗𫖮顜𱂴顝𱂵顠𱂺顣𫖹顤𱂣顦𱂻顩𱂫顪𱂤顮𱂸颩𱃔颬𱃕颰𩙥颲𱃘颴𬱽颷𩙪颹𬱵颽𬱼颾𩙫颿𬳳飁𱃟飂𮨵飇𱃠飉𬲅飊𮸼飋𫗋飍𱃝飝𮸽飤𬲦飦𫗞飰𱃴飵𫗢飶𫗣飷𬲭餀𮩜餂𱃺餔𫗦餗𫗧餟𬳂餢𱃾餣𬲼餤𱃿餦𫗠餧𫗪餩𱃽餪𫗬餫𫗥餬𫗫餭𫗮餯𱄄餰𬳆餲𮩝餴𱃼餵𫗭餸𩠌餹𬳍饀𬳊饆𮩛饇𱃲饎𱄆饐𮩞饘𫗴饙𱄀饛𱄈饟𫗵饠𫗩饡𱄊馩𬳟馪𮹀馯𫘛馲𱄽馵𱄼馺𱅂馼𫘜馽𱅁駂𱅀駃𫘝駉𬳶駊𫘟駍𬳴駎𩧨駏𱅃駓𬳵駗𱅇駚𩧫駜𱅈駞𫘞駣𱅏駤𫘠駥𱅉駧𩧲駩𩧴駪𬳽駫𫘡駬𱅋駮𱅐駴𮪢駶𩧺駷𱅔駹𮪡駺𬴀駻𫘣駼𬳿駽𱅖駾𱅙騀𱅗騃𫘤騄𫘧騆𮹋騇𱅚騉𫘥騊𫘦騋𱅕騑𬴂騔𩨀騕𱅜騗𱅝騚𩨊騛𮹂騜𫘩騝𩨃騞𬴃騟𩨈騠𫘨騢𱅞騣𮪣騥𱅟騩𱅡騪𩨄騬𱅢騯𬴅騱𫘬騲𮪤騳𱄿騴𫘫騵𫘪騹𬴆騺𱅊騻𫘭騼𫠋騽𱅩驈𱅫驉𱅧驋𩧯驎𬴊驐𮪥驒𱅛驓𫘯驔𱅪驖𬴋驙𫘰驞𱅤驠𱅬驡𱅅驨𫘱驩𬴐髐𱅮鬖𩭹鬗𱆆鬜𱆁鬝𱆀鬞𬴩鬠𫘽鬡𮫂鬺𱆌魗𱆛魜𬶁魝𬶀魟𫚉魠𱇏魡𬶄魣𮬛魥𩽹魦𫚌魧𱇘魪𬶇魫𱇙魬𱇖魭𱇐魮𱇒魱𱇓魵𫚍魶𱇔魻𱇟魼𱇜魽𫠐魾𱇝鮀𬶍鮂𱇠鮄𫚒鮅𫚑鮆𫚖鮇𱇛鮈𬶋鮌𱇢鮏𱇡鮘𬶌鮛𱇨鮟𩽾鮠𬶏鮡𬶐鮤𫚓鮥𱇪鮧𱇧鮨𮬜鮬𱇦鮯𫚗鮰𫚔鮵𫚛鮷𬶕鮸𩾃鮹𱇯鮻𱇳鮿𫚚鯄𩾁鯅𱈁鯆𫚙鯈𱇱鯌𬶔鯚𱇺鯞𫚡鯠𱇭鯥𱇶鯦𱇼鯩𱇗鯬𫚞鯮𱇾鯱𩾇鯶𩽼鯸𱈄鯹𬶢鯻𬶟鯼𱈅鯾𫚣鰅𱈂鰇𬶧鰊𬶠鰋𫚢鰑𫚊鰕𫚥鰗𬶞鰝𱈋鰡𱈊鰤𫚕鰦𫚤鰫𫚦鰬𱈉鰯𱈍鰴𱈑鰶𬶭鰽𫚧鰿𱇵鱀𬶨鱁𱈏鱃𱈌鱆𫠒鱇𩾌鱊𫚪鱋𬶬鱌𬶲鱍𱇣鱎𱇩鱏𱈓鱐𱇿鱑𬶫鱓𬶛鱕𱈕鱚𬶮鱞𬶵鱢𫚫鱥𮬝鱦𱇸鱬𱈗鱮𫚈鱲𫚭鱴𱈙鱵𮬤鱹𬶺鱻𱈜鳦𱉇鳭𱉈鳱𱉊鳷𫛛鳸𱉓鳺𱉎鳻𱉑鳼𪉃鳽𫛚鳿𱉍鴀𫛜鴁𮭢鴂𱉔鴃𫛞鴅𫛝鴍𬸀鴐𫛤鴓𮭤鴔𫛡鴗𫁡鴘𱉡鴙𱉛鴚𱉕鴜𪉈鴠𱉗鴡𱉘鴢𱉢鴥𫛣鴩𱉚鴫𮴿鴮𫛦鴱𱉪鴲𪉆鴳𫛩鴶𱉥鴸𱉫鴹𱉯鴺𱉩鴽𫛪鴾𱉲鵀𬸊鵄𬸈鵅𱉮鵊𫛥鵋𱉽鵌𱉸鵎𱉻鵏𬷕鵔𱉿鵕𱉾鵖𱉝鵗𱉹鵙𱉐鵚𪉍鵛𱉠鵟𫛭鵧𫛨鵩𫛳鵫𫛱鵰𫛲鵱𱊀鵳𱊋鵴𱊇鵵𱊆鵶𱉨鵸𱊁鵹𱊃鵻𱊅鵼𱊊鵽𱊍鶀𬸒鶃𱊄鶅𱊎鶆𱉵鶋𱊌鶌𫛵鶒𫛶鶔𱊗鶕𬸝鶗𫛸鶙𱊕鶛𱊐鶝𱊏鶞𱊑鶟𱊖鶠𬸘鶢𱊒鶣𬸜鶤𱉱鶦𫛷鶨𱊘鶭𫛯鶰𫛫鶱𬸣鶵𬸅鶶𱊝鶷𱊟鶽𱊛鷃𮭨鷅𫛽鷇𬆮鷋𱊠鷎𬸢鷏𱊚鷐𫜀鷑𱊢鷒𱉏鷔𪉑鷕𱊡鷛𱊤鷜𬸞鷞𮭪鷟𬸦鷢𱊧鷣𫜃鷤𫛴鷧𱊦鷨𪉊鷩𫜁鷭𬸪鷮𱉬鷰𬸧鷵𱊩鷶𱉳鷷𫜄鷾𱊰鷿𬸯鸀𱊬鸁𱊮鸃𱉌鸄𱊯鸅𱉟鸆𱊫鸉𱉴鸋𫛢鸎𬸕鸐𱊱鸑𬸚鸒𱊭鸓𱊳鸖𬸰鸗𫛟鸙𱊵鸜𬸱麡𬸾麧𱋇麨𪎊麬𤿲麮𱋋麰𮮇麱𱋖麲𪎉麳𪎌麷𫜑黂𱋱黸𱋶鼀𱋾鼁𱋿鼄𬹣鼅𱌄鼆𱌆鼈𱌇鼊𱌉鼚𱌊鼲𱌏齈𱌖齌𱌗齍𱌘齖𬹺齘𬹼齚𱌬齝𱌯齞𱌫齤𱌲齥𱌱齧𫜩齩𫜪齭𫜭齮𬺈齯𫠜齰𫜬齱𱌶齳𱌳齴𫜮齵𱌹齸𱌽齹𬺎齺𱌭齻𱌺齼𬺓齽𬺔齾𫜰龏𱍁龓𫜲龖𱍂龘𮹝龝𬓫龞𱍈龥𬱳龭𩨎龯𨱆龲𰾋龻𰁜龽𰞳鿂𮷙"],
  [2,3,"𡞵㛟𡠹㛿𡢃㛠𡾱㟜𢣏㦈𢸁挙𣈶暅𣙎㭣𣞁㮠𣯶毶𣾷㳢𤎱㷪𤪺㻘𤫩㻏𤷽㾡𥢢䅪𥵜䇚𧍕䖼𧜗䘞𧜵䙊𧝞䘛𧩙䜥𧰎鿲𧵳䞌𧶧䞎𨊰䢀𨊸䢁𨋢䢂𨦫䦀𨧜䦁𨯅䥿𩞯䭪𩣑䯃𩶘䲞𩷓鿵𩷕鿶𩹎鿷𪄳鿺𬉧鿰𬵨鿹𱆥鿕"],
  [2,4,"𠁔𫷘𠁞𠀾𠌥𠆿𠎅𰂃𠎒𫢨𠏄𮯻𠏢𠉗𠏮𫢘𠏵𮯹𠐇𭫝𠐊𫝋𠐍𫣫𠐮𬾣𠐽𫢔𠑇𰂻𠑙𫢹𠑲𫣛𠖥𮰄𠖫𫤽𠗿𰄁𠘥𫥍𠜲𫥼𠝿𫦁𠞆𠛆𠞭𫦉𠟪𫥺𠠎𠚳𠠏𫥵𠠝𫥳𠠫𰄭𠩘𫨆𠩬𰆙𠬙𪠡𠵔𭇴𠵘𫩖𠵹𫩚𠶸𠳞𠶹𰇡𠷌𰇘𠷏𫡬𠹛𫩯𠺖𭈈𠺮𫪅𠼗𫪚𠼤𫪄𠼮𫩳𠽈𭈟𠽸𬱞𠾬𫪽𠿕𪜎𠿘𭉨𠿿𭇀𡀠𭈜𡀿𫫵𡁚𭇙𡁯𭇡𡂒𫪪𡂡𪢒𡂿𫪘𡃄𪡺𡃈𰈮𡃤𪢐𡄔𠴢𡄖𭈉𡄣𠵸𡄤𭈮𡄩𭝫𡅏𠲥𡅘𭊸𡅥𫬟𡅧𭉼𡍫𫭮𡑍𫭼𡑎𫭯𡑑𮰠𡑭𡋗𡑯𰉱𡒶𡏆𡓁𪤄𡓗𫝡𡓦𰊅𡓾𡋀𡗆𰋖𡟫𫝪𡠚𰋾𡠪𮱔𡢄𮱆𡢘𰌉𡢿𭑸𡣨𡡇𡤠𫰣𡤡𭑹𡤢𮱊𡤫𫱿𡤶𮱐𡮉𡭜𡮣𡭬𡮤𫴼𡳳𡳃𡷨𫵸𡸗𪨩𡹬𪨹𡺠𰎝𡺨𫵶𡼱𰎢𡼾𰎛𡽗𡸃𡽳𫶊𡽵𫵹𡾆𰎷𡿖𪩛𢄋𦭬𢄓𰏓𢄼𫷈𢅡𫷌𢅣𭘚𢉿𰏲𢊃𰏽𢍰𪪴𢐗𰐚𢐟𮱵𢕩𢓅𢖕𪢈𢛔𫹼𢜭𪫸𢞁𮲂𢠰𰑅𢠼𢙑𢢀𫺒𢣐𪬚𢣚𢘝𢣭𢘞𢤌𫻇𢤜𫺫𢤧𰒖𢤩𪫡𢤱𢘙𢤿𪬯𢥠𫹷𢯦𫼲𢯩𫼤𢯷𪭝𢱡𫼶𢲐𰓝𢲩𫼾𢲫𫼗𢲸𫼵𢲾𫼫𢳂𫼣𢳚𫽐𢴦𫽙𢴩𫽳𢵣𭡵𢵱𮲏𢶑𫽲𢶒𪭯𢶫𢫞𢷃𫽔𢷏𢪗𢷞𭢕𢷮𢫊𢸔𭢋𢸙𭡜𢸳𫾃𢸴𫾁𢸸𰓕𢹏𰔶𢹥𰓗𢹼𰓟𢹿𢬦𢺎𭢝𢺳𪮳𢿓𫿂𢿡𰕐𣀘𫾳𣀷𫾲𣀻𫿗𣂈𦮜𣄸𬀥𣊯𭥓𣋋𣈣𣋞𣉼𣋪𮲨𣌂𬁑𣍐𫧃𣎄𦞌𣎜𰮭𣔿𰗘𣙿𬃮𣚙𬃦𣛣𬂻𣝕𣘷𣝡𮲸𣞐𰗚𣞻𣘓𣞼𮲸𣠕𬄞𣠩𣞎𣠲𣑶𣡌𬄬𣡶𬃳𣤋𰙕𣤿𬶷𣩕𬆙𣫒𫶲𣯩𣯣𣯴𣭤𣰛𰚱𣰨𬇄𣵾𮳅𣶯𰛉𣻏𬇼𣻑𭰒𣼊𭰗𣼩𰛺𣼼𮳈𣽏𪶮𣿉𣶫𣿭𮳃𤀪𬈱𤁐𮳍𤁣𣺽𤁪𬈾𤄙𰝞𤄷𪶒𤅊𮳖𤅙𬇬𤅩𭰥𤅷𰛻𤆼𮳢𤇾𫇦𤍖𬊗𤍜𰞷𤎤𬝃𤏐𭴳𤏩𮳯𤏳𮳱𤑚𮳶𤑳𤎻𤑹𪹀𤒎𤊀𤒦𬋃𤒨𮳸𤒻𪹹𤓌𪹠𤓎𤎺𤓓𬊜𤘀𪺣𤚴𮳺𤛮𤙯𤛱𫞢𤜆𪺪𤟤𰡋𤠔𰡐𤠮𪺸𤡲𤜵𤢟𤝢𤣎𰡢𤣤𬌴𤥭𰡰𤥵𮴑𤦎𮴅𤦩𮴏𤧑𮴆𤧸𮴒𤩂𫞧𤩊𮴗𤩑𮴥𤩝𮴓𤪤𪛞𤪧𮴇𤫎𮴶𤫟𮴠𤬅𪼴𤮦𬎬𤲓𭻔𤲢𭻍𤳷𪽝𤳸𤳄𤷃𪽭𤸫𤶧𤺉𰣦𤺔𪽴𤻜𤹺𤻝𰣩𤻲𬏤𤼈𰣫𤾉𰤓𥀬𪠏𥀲𰤫𥂫𰤽𥂸𬐠𥇔𬑇𥉸𰥣𥋝𰥭𥋟𮵅𥌃𥅘𥌚𬑙𥏝𪿊𥔂𮀲𥔬𮵊𥕥𥐰𥖅𥐯𥖏𮀪𥖩𬒊𥖲𪿞𥗇𪿵𥗴𬒓𥗹𰧈𥗺𬒇𥗽𬒗𥘃𮀡𥚗𮵙𥜐𫀓𥜰𫀌𥞵𥞦𥢊𬓱𥢶𫞷𥢷𫀮𥣻𦼖𥨐𥧂𥪂𥩺𥯤𫁳𥱸𬔯𥳊𬔹𥴨𫂖𥴼𫁺𥵃𥱔𥵊𥭉𥵛𮅎𥵝𬕬𥸠𥮋𥺼𮇔𥻤𬖖𥻦𫂿𥻵𬖞𥼶𬖘𥼽𥹥𥽖𥺇𥽭𬖺𥽽𫧷𥾂𮇤𥾝𬘔𥾯𫄝𥿉𬘚𥿊𦈈𥿑𮶁𥿯𬘦𦀎𮉥𦀖𫄦𦁄𰬙𦁕𰬦𦁧𰬨𦂅𦈒𦂋𬘸𦃄𦈗𦃒𬘼𦃘𬘽𦃩𫄯𦄋𬘞𦄍𬘾𦄧𬘿𦄼𬘳𦅇𫄪𦅈𫄵𦅋𬙃𦅘𰬝𦅷𬙅𦆆𰬾𦆈𰬹𦆲𫟇𦇎𰭁𦇛𰬼𦌾𬙪𦍆𬙫𦎹𰭚𦏑𰭗𦒀𫅥𦔖𫅼𦘧𡳒𦜖𬁺𦝛𮶔𦞛𬁸𦟐𬁳𦟼𫆝𦠅𫞅𦡏𰗅𦡖𰗆𦡝𫆫𦡧𮌌𦡶𰯂𦢈𣍨𦣇𬂂𦣎𦟗𦥯𰃮𦧴𰰆𦧺𫇘𦪭𬜔𦪽𦨩𦱌𫇪𦳝𰰢𦴧𮶞𦵕𬝖𦶆𬜺𦸷𬝊𦺣𰱝𦽒𬝠𦾏𰅻𦾵𦴇𦾶𬞋𦿍𦬙𦿭𮶷𧀀𮶩𧁿𮏺𧂂𮶬𧂅𬞣𧃽𰱊𧏻𬠃𧐐𰳁𧐱𬟺𧒖𰲺𧒯𫊹𧔥𧒭𧕟𧉐𧕦𬠷𧖦𬠱𧛸𬡎𧜁𬡕𧜂𬡔𧜘𮷁𧜣𬡍𧜶𮖃𧞅𰳻𧞔𧜡𧞣𰳹𧞫𫌋𧞶𬡦𧟌𬡠𧠈𬢇𧠥𬢉𧠳𮷄𧠵𬢍𧡍𬢈𧡪𬢏𧡴𫌫𧡸𰴛𧢃𰴚𧢄𫌬𧢍𬢓𧢢𬺟𧣴𬢕𧥣𬣚𧥺𬣝𧦝𫍞𧦦𰵘𧦧𫍟𧦭𬣢𧦵𮷆𧧝𬣨𧧭𬣺𧧵𰵢𧧸𰵬𧨊𬣶𧨝𰵪𧨳𰵳𧨾𬤂𧩎𮷉𧩕𫍭𧩦𬤅𧩧𬤏𧩪𬤋𧩼𫍶𧪞𬤒𧪡𬤓𧪦𬤕𧪪𬤔𧪮𰵻𧫚𬤈𧫝𫍺𧬁𰶅𧬅𬤜𧬇𬤞𧬌𬤠𧬤𫍼𧬨𬣪𧬪𬤖𧬮𬤧𧬯𰶋𧬻𬣵𧭈𫍾𧭥𮷇𧭹𫍐𧮆𬤚𧮇𬣴𧮈𬤯𧮓𬤱𧰆𬤷𧱻𰶨𧳟𧳕𧴪𭕆𧵊𬥴𧶄𬥷𧶔𧹓𧶟𬥹𧶲𬥼𧷎𪠀𧷛𰷨𧸖𰷬𧸘𫎨𧸦𬥾𧸪𬥿𧸫𫬙𧹈𪥠𧼮𬦅𧽢𬦆𧽯𫎸𧽵𧺣𧾥𰷸𨁂𬦯𨂐𫏌𨃘𬦩𨃜𬦹𨄉𰸎𨄣𨀱𨄰𬦵𨅍𨁴𨆅𬦫𨆉𮛗𨆪𫏕𨆱𬦴𨇁𧿈𨇍𬧑𨇗𬦣𨇞𨅫𨇤𫏨𨇯𰸇𨇰𫏞𨇽𫏑𨈀𬧚𨈆𬧛𨈇𬦾𨈊𨂺𨈌𨄄𨉖𰿰𨉹𬧩𨊠𰹱𨊹𰹻𨊻𨐆𨋁𬨃𨋚𬨅𨋮𰺆𨌄𬨋𨌈𫐍𨍈𰺔𨍏𰺕𨍐𬨏𨍒𰹾𨍰𫐔𨍹𬨐𨎌𫐋𨎩𬨒𨎪𰺚𨎮𨐉𨏒𰺢𨏔𰺌𨏠𨐇𨏥𨐊𨐶𰺨𨑊𫯒𨘀𮷥𨘌𬩎𨞨𨝕𨞪𫜷𨞺𫟫𨟊𫟬𨟑𮷨𨢿𨡙𨣃𰼋𨣈𨡺𨣉𬪫𨣞𨟳𨣧𨠨𨣨𰼏𨤋𬪯𨤡𬪺𨤻𨤰𨥈𮷵𨥕𮷹𨥛𨱀𨥜𬬴𨥟𫓫𨥤𮷽𨥦𬬳𨥭𮸃𨥮𮷿𨥺𬭂𨦍𮸅𨦡𰽽𨦱𰾊𨧀𬭊𨧐𰾇𨧚𬭐𨧫𬭑𨧰𫟽𨧱𨱊𨨏𬭛𨨛𫓼𨨝𬭘𨨢𫓿𨨯𬭟𨨹𬭞𨩃𮸔𨩎𮸘𨩨𬭠𨩰𫟾𨪅𬇃𨪋𰾨𨪕𫓮𨪜𮸚𨪦𮸙𨫀𬭫𨫋𮸉𨫒𨱐𨫼𰾧𨬂𬭱𨬒𰾳𨬖𫔏𨬞𬬶𨬟𰾵𨭃𬭷𨭆𬭶𨭌𬭵𨭎𬭳𨭐𬭙𨭖𫔑𨭗𬭇𨭚𬭺𨭛𰾿𨭥𬬼𨭸𫔐𨮁𰾺𨮂𨱕𨮅𬭹𨮰𬭾𨮳𫔒𨯂𮸣𨯗𮸝𨯙𮸆𨯟𫔓𨯵𬮀𨰃𫔉𨰋𫓳𨰘𮷷𨰠𰿊𨰥𫔕𨰭𬮃𨰲𫔃𨰵𬬇𨰷𬮂𨰹𰿀𨱥𰿖𨲭𬮄𨲳𫔖𨳌𰿦𨳐𰿧𨳑𨸁𨳒𮤭𨳕𨸀𨳙𮤯𨳚𰿪𨳨𬮜𨳸𰿭𨳿𬮡𨴑𬮣𨴗𨸅𨴤𬮧𨴹𫔲𨵆𬮩𨵌𬮰𨵗𬮯𨵤𬮮𨵦𰿵𨵩𨸆𨵬𬮵𨵸𨸇𨶀𨸉𨶏𨸊𨶑𰿸𨶮𨸌𨶯𮤸𨶰𰿹𨶲𨸋𨶻𬮸𨶿𬮹𨷈𬮙𨷲𨸎𨷻𫔱𨼳𫔽𨽈𨻹𨽏𨸘𩀨𫕚𩅙𫕨𩅦𱁞𩅾𫡶𩇉𮦚𩉍𬰣𩉙𬰡𩋬𱁱𩋰𬰤𩍜𱁳𩎒𬰱𩎕𱂃𩎖𫖑𩎟𱂄𩎠𬰴𩎢𩏾𩏂𫖓𩏌𬰵𩏠𫖖𩏪𩏽𩏴𬰸𩏷𫃗𩐌𱂍𩐳𮸷𩑃𬰺𩑒𱂠𩑔𫖪𩑡𱂡𩑣𬱔𩑦𬱕𩒎𫖭𩒜𬱡𩒝𬱝𩒲𬱤𩒺𱂩𩒼𬱥𩓣𩖕𩓥𫖵𩓸𬱧𩓹𬱨𩔇𱂳𩔈𬱭𩔊𬱛𩔐𮸶𩔑𫖷𩔣𱂷𩔳𫖴𩕊𬱱𩕰𬱲𩖁𬺂𩖰𫠇𩖿𬱺𩗀𩙦𩗓𫗈𩗛𱃛𩗡𩙧𩗩𮷻𩗴𫗉𩗺𮸻𩘀𩙩𩘚𬰲𩘝𩙭𩘹𩙨𩘺𩙬𩘻𬲆𩙈𩙰𩚅𬲥𩚚𬲩𩚛𩟿𩚥𩠀𩚩𫗡𩚵𩠁𩛆𩠂𩛌𫗤𩛎𬲴𩛞𬲺𩛡𫗨𩛩𩠃𩛲𬲹𩜇𩠉𩜠𬲿𩜦𩠆𩜯𱄂𩜰𬳃𩜵𩠊𩜶𱄁𩝑𬳇𩝔𩠋𩝠𬳌𩝡𬳈𩝣𬳉𩝧𱄅𩝽𫗳𩞃𬲰𩞄𩠎𩞆𬲪𩞉𬳐𩞡𬲬𩞦𩠏𩞧𱄇𩞬𬳒𩟀𬳓𩟂𬲸𩟐𩠅𩟗𫗚𩟠𬳔𩠴𩠠𩡣𩡖𩡤𩡚𩡺𩧦𩢀𮹄𩢍𬳷𩢖𮹅𩢡𩧬𩢰𱅎𩢲𬳺𩢴𩧵𩢸𩧳𩢼𬳻𩢾𩧮𩣊𱅍𩣋𬳼𩣏𩧶𩣔𬳹𩣡𱅓𩣫𩧸𩣵𩧻𩣺𩧼𩤊𩧩𩤙𩨆𩤲𩨉𩤵𬴄𩤸𩨅𩥃𱅥𩥄𩨋𩥅𱅣𩥇𩨍𩥈𮹌𩥉𩧱𩥎𱅨𩥑𩨌𩥲𬴇𩥼𬴈𩦃𱅘𩦚𬴉𩦠𫠌𩦺𬴌𩧆𩨐𩧉𱄾𩧐𬴎𩧢𱅒𩭙𩬣𩭯𩬾𩯁𫙂𩯃𱆄𩯆𬴨𩯳𩯒𩰀𩬤𩰹𩰰𩱈𱆍𩳤𩲒𩴆𱆖𩴵𩴌𩵚𬶂𩵦𫠏𩵩𩽺𩵱𬶉𩵳𮹓𩵹𩽻𩵺𬶈𩶀𬶅𩶁𫚎𩶯𱇫𩶰𩽿𩶱𩽽𩷒𬶒𩷰𩾄𩷶𱇮𩸃𩾅𩸄𫚝𩸆𬶖𩸡𫚟𩸣𬶙𩸤𬶚𩸦𩾆𩸩𬶝𩸬𬶜𩹂𱈃𩹊𬶦𩹝𬶡𩹽𬶩𩹾𱇴𩺝𬶪𩺞𱈎𩻗𫚨𩻛𱈔𩻧𬶯𩻬𫚩𩻮𫚘𩻰𬶰𩻱𬶱𩼔𬶶𩼶𫚬𩽅𬶸𩽇𩾎𩽈𬶳𩽔𬶹𩽷𬶻𩾐𬷻𩾒𬷽𩾝𱉋𩿅𫠖𩿊𱉒𩿤𫛠𩿧𱉜𩿪𪉄𩿱𬸃𩿺𬸁𪀉𬸂𪀖𫛧𪀗𱉭𪀚𱉣𪀛𬸉𪀦𪉅𪀻𬸋𪀾𪉋𪁈𪉉𪁏𮭦𪁐𬸎𪁑𬸑𪁖𪉌𪁛𱉷𪁜𬸏𪁱𬸐𪁿𬸔𪂆𪉎𪂈𬸖𪂩𬸗𪂫𬸓𪃃𱊔𪃍𪉐𪃏𪉏𪃒𫛻𪃦𬸙𪃧𫛹𪃮𬸟𪃿𬸠𪄅𬸌𪄆𪉔𪄕𪉒𪄠𱊞𪄲𱊥𪅂𫜂𪅃𬸤𪅖𬸥𪅜𬷿𪅾𬸨𪆃𬸫𪆫𱊨𪆰𬸭𪆴𬸮𪆷𫛾𪇄𬸬𪇖𬸡𪇘𬸍𪇰𱊲𪇳𪉕𪈏𱊴𪈔𱊉𪈗𬸄𪈼𱊜𪉖𱊺𪉜𬸵𪉣𱊻𪉨𬸶𪉮𬸷𪉱𬸸𪉸𫜊𪉿𬸹𪊉𱊽𪋼𱋅𪋽𱋄𪋿𫧮𪌐𱋉𪌒𮮅𪌗𱋌𪌘𱋍𪌜𪽂𪌣𱋓𪌨𰎴𪌬𱋕𪌭𫜓𪌮𱋘𪌯𬹈𪌰𬹇𪌽𬹋𪌾𱋚𪌿𬹌𪍀𬹊𪍇𱋜𪍍𱋠𪍑𱋢𪍒𱋟𪍓𱋥𪍘𱋤𪍚𱋣𪍞𱋦𪍠𫜕𪍣𱋡𪍤𬹍𪍬𱋨𪍴𱋬𪍶𬹎𪍷𱋑𪍿𱋈𪎂𱋭𪑚𬹗𪑳𬹕𪒬𬹖𪒿𬹘𪓛𱌀𪓬𱌅𪓰𫜟𪓹𱌈𪓽𬹤𪔵𪔭𪕣𬹭𪖨𱌕𪗋𱌙𪗜𬹽𪗝𬹻𪗪𬹿𪗭𬺀𪗳𬹾𪗻𬺁𪗽𬺄𪘀𪚏𪘅𰳆𪘓𬺇𪘞𬺆𪘥𱌸𪘧𬺋𪘨𱌴𪘩𬺊𪘬𱌷𪘯𪚐𪘲𬺌𪙉𱌼𪙍𬺏𪙏𫜯𪙑𬺑𪙕𬺐𪙞𬺅𪙤𬺒𪚅𬺖𪚔𬺛𪚣𬺝𪚭𱍅𪚮𱍄𪚰𱍆𪛕𱍉𪝖𫢟𪝵𰂁𪟖𠛾𪢍𭉗𪢥𫩸𪦯𮱕𪮰𫼽𪯂𭡆𪳷𬂱𪴥𬃏𪵢𰚬𪷈𭱀𪼑𮴚𪾳𮵆𫃐𬖟𫃑𰪿𫃞𰫿𫃥𮉩𫃷𮉭𫃻𮶅𫄇𬘹𫇠𮎍𫈹𰰿𫉍𮏀𫋐𬠈𫋧𧈴𫌙𬡱𫍘𫍏𫒊𮷷𫒋𮷺𫒞𬭋𫒟𮸋𫒡𫓷𫒢𰾉𫒷𰾣𫓔𮷶𫔘𰿥𫔡𰿯𫖞𬱘𫗑𬲵𫗕𬳄𫗻𬳙𫘋𮹉𫜦𫜫𫣴𫢲𫥝𫥔𫦔𫦋𫦙𫥽𫦸𫦰𫧝𪟲𫨑𪠃𫪛𭇉𫬆𫫏𫬱𰇥𫯓𬻮𫲉𮰻𫲴𭓀𫶦𫶄𫺤𮲅𫻑𫺹𫾡𫾏𬄝𬃛𬅁𮲺𬆉𬆂𬉤𬈏𬊿𮳬𬌦𬌠𬍁𬌵𬎟𮴌𬏲𰣢𬑡𬑍𬒒𬒄𬓡𠂲𬕜𮵭𬗈𮶀𬗏𬘣𬗺𬙀𬙔𬙏𬛕𣘾𬞼𮶳𬠐𧈿𬣍𬣫𬣘𬤗𬥲𬦀𬧙𬧔𬫉𮸂𬫍𮸄𬮇𬮝𬮍𮤷𬯘𬯊𬱂𬱚𬱈𬱩𬲚𬳎𬲛𫗲𬵂𱇎𬵃𬶃𬵮𬶑𬶼𱉉𬷈𮹕𬹂𬹆𭂖𰃶𭉾𰇊𭑙𮤮𭗡𡻘𭜼𮲀𭢒𰓤𭧒𰖏𭧖𰖚𭨡𰁈𭱘𰛨𭶙𤇻𭹰𮴊𮜗𰸦𮟽𰻨𮡈𨢸𮢅𮸑𮢆𮸒𮤏𮤳𮤒𬮬𮦗𮦅𮨭𬱾𮨻𬲱𮱚𱙋𮱣𪨇𮱱𮱦𮸾𲋢𰂠𪜺𰂴𫢜𰃴𰃳𰈝𫪑𰉀𪢋𰋆𪤅𰎼𰎦𰔠𭠽𰔫𫽫𰔺𫽢𰖻𬁘𰘯𰘅𰚂𪵇𰚣𰚍𰝜𣴇𰝢𰛱𰟫𰟄𰡓𰡉𰫆𰪪𰫏𰪼𰫛𬘗𰫳𬙄𰯲𰀢𰴏𫌩𰴦𰴥𰴽𬤃𰹈𰹯𰻞𰻝𰿢𮤶𱃡𬲨𱃢𬲧𱃪𬲽𱇋𬶥𱋂𪋈𱵭𮵚𲥂𮲚𲪙𮳎𲪼𮳄𲰍𮴕𳅰𮷼𳈆𮸧"]
];
// END GENERATED HAN VARIANTS
// Matching canonicalizes unambiguous Han character variants only. This does
// not translate names or change the original lyrics or translation comparison.
function foldHan(input) {
  if (!/[\u3400-\u9fff\u{20000}-\u{3ffff}]/u.test(input)) return input;
  let output = "";
  for (const character of input) {
    const cp = character.codePointAt(0); let mapped = character;
    for (const [width,stride,table] of HAN_TABLES) {
      if (character.length !== width) continue;
      let low = 0, high = table.length / stride - 1;
      while (low <= high) {
        const mid = (low + high) >>> 1, at = mid * stride, key = table.codePointAt(at);
        if (cp < key) high = mid - 1;
        else if (cp > key) low = mid + 1;
        else { mapped = table.slice(at + width, at + stride); break; }
      }
      if (mapped !== character) break;
    }
    output += mapped;
  }
  return output;
}
function metadataNormal(value) { return normal(foldHan(clean(value).normalize("NFKC"))); }
function header(h, name) {
  if (typeof h?.get === "function") return h.get(name) || "";
  const k = Object.keys(h || {}).find(k => k.toLowerCase() === name.toLowerCase());
  return k ? str(h[k]) : "";
}
function utf8(text, maxBytes = LIMIT) {
  // Two bounded passes, with no percent-encoded string or boxed byte array.
  let size = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const d = text.charCodeAt(++i); if (!(d >= 0xdc00 && d <= 0xdfff)) throw new URIError("invalid-utf16"); size += 4;
    } else if (c >= 0xdc00 && c <= 0xdfff) throw new URIError("invalid-utf16");
    else size += c < 0x80 ? 1 : c < 0x800 ? 2 : 3;
    if (size > maxBytes) { const error = new Error("body-limit"); error.bodyBytes = size; throw error; }
  }
  const out = new Uint8Array(size); let at = 0;
  for (let i = 0; i < text.length; i++) {
    let c = text.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) c = 0x10000 + ((c - 0xd800) << 10) + text.charCodeAt(++i) - 0xdc00;
    if (c < 0x80) out[at++] = c;
    else if (c < 0x800) { out[at++] = 0xc0 | c >> 6; out[at++] = 0x80 | c & 63; }
    else if (c < 0x10000) { out[at++] = 0xe0 | c >> 12; out[at++] = 0x80 | c >> 6 & 63; out[at++] = 0x80 | c & 63; }
    else { out[at++] = 0xf0 | c >> 18; out[at++] = 0x80 | c >> 12 & 63; out[at++] = 0x80 | c >> 6 & 63; out[at++] = 0x80 | c & 63; }
  }
  return out;
}
function text(bytes) {
  // Works without TextDecoder in mobile proxy engines. Scratch storage never
  // exceeds 4097 UTF-16 units, even for a multi-megabyte response.
  const chunks = [], units = [];
  for (let i = 0; i < bytes.length;) {
    const first = bytes[i++]; let cp, count, minimum;
    if (first < 0x80) { cp = first; count = 0; minimum = 0; }
    else if (first >= 0xc2 && first <= 0xdf) { cp = first & 31; count = 1; minimum = 0x80; }
    else if (first >= 0xe0 && first <= 0xef) { cp = first & 15; count = 2; minimum = 0x800; }
    else if (first >= 0xf0 && first <= 0xf4) { cp = first & 7; count = 3; minimum = 0x10000; }
    else throw new URIError("invalid-utf8");
    for (let j = 0; j < count; j++) { const b = bytes[i++]; if (!(b >= 0x80 && b <= 0xbf)) throw new URIError("invalid-utf8"); cp = cp * 64 + (b & 63); }
    if (cp < minimum || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) throw new URIError("invalid-utf8");
    if (cp < 0x10000) units.push(cp); else { cp -= 0x10000; units.push(0xd800 | cp >> 10, 0xdc00 | cp & 1023); }
    if (units.length >= 4096) { chunks.push(String.fromCharCode.apply(null, units)); units.length = 0; }
  }
  if (units.length) chunks.push(String.fromCharCode.apply(null, units));
  return chunks.join("");
}
function join(parts) {
  const size = parts.reduce((n, p) => n + p.length, 0);
  if (size > LIMIT) throw new Error("body-limit");
  const out = new Uint8Array(size); let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}
function uint(n) {
  if (!Number.isSafeInteger(n) || n < 0) throw new Error("integer");
  const a = [];
  do { const b = n % 128; n = Math.floor(n / 128); a.push(b + (n ? 128 : 0)); } while (n);
  return Uint8Array.from(a);
}
function signedInt(n) {
  if (n >= 0) return uint(n);
  let low = n >>> 0; const a = [];
  for (let i = 0; i < 4; i++) { a.push((low % 128) | 128); low = Math.floor(low / 128); }
  a.push(low | 240, 255, 255, 255, 255, 1);
  return Uint8Array.from(a);
}
function vint(bytes, at) {
  let n = 0, factor = 1, safe = true;
  for (let i = 0; i < 10; i++) {
    if (at >= bytes.length) throw new Error("truncated-varint");
    const b = bytes[at++];
    if (i === 9 && b > 1) throw new Error("overflow-varint");
    n += (b & 127) * factor;
    safe = safe && Number.isSafeInteger(n);
    if (!(b & 128)) return { at, n: safe ? n : null };
    factor *= 128;
  }
  throw new Error("long-varint");
}
// Untouched fields retain their original wire bytes, including unknown fields.
function fields(bytes) {
  const out = []; let at = 0;
  while (at < bytes.length) {
    if (out.length >= 4096) throw new Error("field-limit");
    const start = at, tag = vint(bytes, at); at = tag.at;
    if (!tag.n || tag.n > 0xffffffff) throw new Error("bad-tag");
    const number = Math.floor(tag.n / 8), wire = tag.n % 8;
    if (number < 1) throw new Error("bad-field-number");
    let payload, value;
    if (wire === 0) { const v = vint(bytes, at); value = v.n; at = v.at; }
    else if (wire === 1 || wire === 5) { at += wire === 1 ? 8 : 4; }
    else if (wire === 2) {
      const len = vint(bytes, at); at = len.at;
      if (len.n === null || len.n > LIMIT) throw new Error("bad-length");
      payload = bytes.subarray(at, at + len.n); at += len.n;
    } else throw new Error("unsupported-wire");
    if (at > bytes.length) throw new Error("truncated-field");
    out.push({ number, wire, payload, value, raw: bytes.subarray(start, at) });
  }
  return out;
}
function dataField(number, payload) { return join([uint(number * 8 + 2), uint(payload.length), payload]); }
function stringField(number, value) { return dataField(number, utf8(value)); }
function numberField(number, value) { return join([uint(number * 8), signedInt(value)]); }
function last(fs, n, wire) { for (let i = fs.length - 1; i >= 0; i--) if (fs[i].number === n && fs[i].wire === wire) return fs[i]; }
function word(fs, n) { const f = last(fs, n, 2); return f ? text(f.payload) : ""; }
function replaceField(fs, number, replacement) {
  let inserted = false; const parts = [];
  for (const f of fs) {
    if (f.number === number) { if (!inserted && replacement) parts.push(replacement); inserted = true; }
    else parts.push(f.raw);
  }
  if (!inserted && replacement) parts.push(replacement);
  return join(parts);
}
function base62Hex(id) {
  if (!/^[0-9A-Za-z]{22}$/.test(id)) throw new Error("track-id");
  const a = new Array(16).fill(0);
  for (const c of id) {
    let carry = B62.indexOf(c);
    for (let i = 15; i >= 0; i--) { const n = a[i] * 62 + carry; a[i] = n % 256; carry = Math.floor(n / 256); }
    if (carry) throw new Error("track-overflow");
  }
  return a.map(n => n.toString(16).padStart(2, "0")).join("");
}
function hexBase62(hex) {
  if (!/^[0-9a-f]{32}$/.test(hex)) throw new Error("track-hex");
  const a = hex.match(/../g).map(x => parseInt(x, 16)); let out = "";
  while (a.some(Boolean)) {
    let carry = 0;
    for (let i = 0; i < a.length; i++) { const n = carry * 256 + a[i]; a[i] = Math.floor(n / 62); carry = n % 62; }
    out = B62[carry] + out;
  }
  return out.padStart(22, "0");
}
function checkTranslationRows(rows, count) {
  if (!Array.isArray(rows) || rows.length !== count || rows.some(row => typeof row !== "string")) throw new Error("native-line-count");
}
function parseDocument(bytes, contentType) {
  if (bytes.length > LIMIT) throw new Error("body-limit");
  let at = 0; while (at < bytes.length && [9, 10, 13, 32].includes(bytes[at])) at++;
  if (/json/i.test(contentType) || (!/protobuf|octet-stream/i.test(contentType) && bytes[at] === 123)) {
    const obj = JSON.parse(text(bytes));
    if (!goodObject(obj) || (obj.lyrics != null && !goodObject(obj.lyrics))) throw new Error("json-shape");
    const lyrics = obj.lyrics;
    if (lyrics && !Array.isArray(lyrics.lines)) throw new Error("line-shape");
    if ((lyrics?.lines.length || 0) > MAX_LINES) throw new Error("line-limit");
    if (lyrics?.lines.some(l => !goodObject(l) || typeof l.words !== "string")) throw new Error("line-shape");
    const words = (lyrics?.lines || []).map(l => l.words);
    return { format: "json", words, obj, lyrics, language: clean(lyrics?.language), blocked: lyrics?.showUpsell === true,
      hasAlternatives: lyrics != null && Object.hasOwn(lyrics, "alternatives") && (!Array.isArray(lyrics.alternatives) || lyrics.alternatives.length > 0),
      writeNative(language, rows) {
        checkTranslationRows(rows, words.length);
        // Keep original rows, timestamps, syllables, preview rows and typography.
        // Own the entire native translation list. Never mix official alternatives
        // into plugin output, including on partial or complete service failure.
        obj.lyrics.alternatives = rows.some(row => clean(row)) ? [{ language, lines: rows }] : [];
        return utf8(JSON.stringify(obj));
      } };
  }
  if (!/protobuf|octet-stream/i.test(contentType)) throw new Error("unknown-format");
  const outer = fields(bytes), containers = outer.filter(f => f.number === 1);
  if (containers.length !== 1 || containers[0].wire !== 2) throw new Error("lyrics-container");
  const inner = fields(containers[0].payload), lineFields = inner.filter(f => f.number === 2);
  if (lineFields.length > MAX_LINES || lineFields.some(f => f.wire !== 2)) throw new Error("line-shape");
  const parsed = lineFields.map(f => fields(f.payload));
  if (parsed.some(fs => fs.filter(f => f.number === 2).length > 1 || fs.some(f => f.number === 2 && f.wire !== 2))) throw new Error("line-shape");
  const words = parsed.map(fs => word(fs, 2)), alternativeFields = inner.filter(f => f.number === 9);
  return { format: "protobuf", words, language: word(inner, 10), blocked: last(inner, 13, 0)?.value === 1,
    hasAlternatives: alternativeFields.length > 0,
    writeNative(language, rows) {
      checkTranslationRows(rows, words.length);
      // LyricsResponse.alternatives = field 9; Alternative.language = field 1;
      // Alternative.lines = repeated UTF-8 strings in field 2, NOT lyric messages.
      const alternative = join([stringField(1, language), ...rows.map(row => stringField(2, row))]);
      const body = replaceField(inner, 9, rows.some(row => clean(row)) ? dataField(9, alternative) : null);
      return replaceField(outer, 1, dataField(1, body));
    } };
}
function encodeDocument(doc, format) {
  if (format === "json") return utf8(JSON.stringify(doc));
  const l = doc.lyrics;
  const body = join([
    numberField(1, l.syncType === "LINE_SYNCED" ? 1 : 0),
    ...l.lines.map(line => dataField(2, join([numberField(1, Number(line.startTimeMs)), stringField(2, line.words)]))),
    stringField(3, l.provider), stringField(5, l.providerDisplayName), stringField(10, l.language || ""),
    ...(l.alternatives || []).map(a => { checkTranslationRows(a.lines, l.lines.length);
      return dataField(9, join([stringField(1, a.language), ...a.lines.map(row => stringField(2, row))])); })
  ]);
  // Native LyricsColors fields are uint32; JSON exposes signed ARGB numbers.
  const colors = join([numberField(1, doc.colors.background >>> 0), numberField(2, doc.colors.text >>> 0), numberField(3, doc.colors.highlightText >>> 0)]);
  return join([dataField(1, body), dataField(2, colors)]);
}
function fallbackFormat(ctx, existing) {
  if (existing) return existing.format;
  const url = str(ctx.request.url), accept = header(ctx.request.headers, "Accept");
  const explicit = /(?:^|[?&])format=(json|protobuf)(?:&|$)/i.exec(url)?.[1].toLowerCase();
  if (explicit) return explicit;
  if (/protobuf|octet-stream/i.test(accept)) return "protobuf";
  if (/(?:^|[,;\s])application\/(?:[a-z0-9.+-]+\+)?json(?:[,;\s]|$)/i.test(accept)) return "json";
  // An error's MIME type describes the error envelope, not the native client's
  // lyric decoder. Wildcard/absent Accept on this native endpoint uses protobuf.
  return "protobuf";
}
// Generated lyrics have no official lyric palette. Use the same track's public
// Spotify embed visual identity; never reuse another song or a fixed green tint.
// Only these color integers are cached, not the page or its session data.
const NEUTRAL_PALETTE = { background: 0xff535353 | 0, text: 0xffc7c7c7 | 0, highlightText: -1 };
function validPalette(value) {
  if (!goodObject(value)) return null;
  const out = {};
  for (const key of ["background", "text", "highlightText"]) {
    const n = value[key];
    if (!Number.isInteger(n) || n < -2147483648 || n > 4294967295 || n >>> 24 !== 255) return null;
    out[key] = n | 0;
  }
  return out;
}
function existingPalette(bytes, doc) {
  try {
    if (doc?.format === "json") return validPalette(doc.obj.colors);
    if (doc?.format !== "protobuf") return null;
    const f = last(fields(bytes), 2, 2); if (!f) return null;
    const colors = fields(f.payload);
    return validPalette({background:last(colors,1,0)?.value,text:last(colors,2,0)?.value,highlightText:last(colors,3,0)?.value});
  } catch { return null; }
}
function paletteContrast(a, b) {
  function luminance(c) {
    const rgb = [16, 8, 0].map(s => ((c >>> s) & 255) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  }
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
function paletteFromEmbed(html, id) {
  if (typeof html !== "string" || html.length > LIMIT || !/^[0-9A-Za-z]{22}$/.test(id)) return null;
  const match = /<script\b[^>]*\bid=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script\s*>/i.exec(html);
  if (!match) return null;
  try {
    const entity = JSON.parse(match[1])?.props?.pageProps?.state?.data?.entity;
    if (entity?.type !== "track" || entity.id !== id || entity.uri !== "spotify:track:" + id) return null;
    const visual = entity.visualIdentity;
    function argb(c) {
      if (!goodObject(c) || c.alpha !== 255 || [c.red,c.green,c.blue].some(n => !Number.isInteger(n) || n < 0 || n > 255)) return null;
      return (0xff000000 | c.red << 16 | c.green << 8 | c.blue) | 0;
    }
    const background = argb(visual?.backgroundBase); if (background === null) return null;
    let highlightText = argb(visual?.textBase), normalText = argb(visual?.textSubdued);
    if (highlightText === null || paletteContrast(background, highlightText) < 4.5) {
      highlightText = paletteContrast(background, -1) >= paletteContrast(background, 0xff000000 | 0) ? -1 : 0xff000000 | 0;
    }
    if (normalText === null || normalText === highlightText || paletteContrast(background, normalText) < 3) {
      // Derive a readable subdued tone when a page lacks one. Both roles remain
      // distinct, including very light artwork with dark foreground text.
      for (const weight of [0.6, 0.7, 0.8, 0.9]) {
        const rgb = [16,8,0].map(s => Math.round(((highlightText >>> s) & 255) * weight + ((background >>> s) & 255) * (1 - weight)));
        normalText = (0xff000000 | rgb[0] << 16 | rgb[1] << 8 | rgb[2]) | 0;
        if (paletteContrast(background, normalText) >= 3) break;
      }
    }
    return validPalette({background,text:normalText,highlightText});
  } catch { return null; }
}
async function fallbackPalette(ctx, id, state) {
  const key = "palette:v1:" + id, cached = state.cache.get(key);
  const saved = validPalette(cached?.colors); if (saved) return saved;
  let colors = null;
  try {
    // A color lookup runs after a successful lyrics lookup, never on card loading,
    // path, and has at most 1.5 seconds of the existing overall time budget.
    const colorState = {...state, deadline: Math.min(state.deadline, Date.now() + 1500)};
    const response = await http(ctx, "https://open.spotify.com/embed/track/" + id, colorState,
      {maxBytes:256 * 1024, headers:{Accept:"text/html", "User-Agent":"VerseLyrics/" + VERSION}});
    colors = paletteFromEmbed(text(response.bytes), id);
  } catch (error) {
    if (error.message === "work-superseded") return {...NEUTRAL_PALETTE};
  }
  const result = colors || {...NEUTRAL_PALETTE};
  state.cache.put(key, {colors:result, source:colors ? "spotify-embed" : "neutral"}, colors ? 86400000 : 300000);
  return result;
}
function parseMetadata(bytes, hex) {
  const fs = fields(bytes), gid = last(fs, 1, 2);
  if (!gid || Array.from(gid.payload, b => b.toString(16).padStart(2, "0")).join("") !== hex) throw new Error("metadata-id");
  const album = last(fs, 3, 2), rawDuration = last(fs, 7, 0)?.value;
  const meta = { id: hexBase62(hex), title: word(fs, 2), album: album ? word(fields(album.payload), 2) : "",
    artists: fs.filter(f => f.number === 4 && f.wire === 2).map(f => word(fields(f.payload), 2)),
    duration: Number.isSafeInteger(rawDuration) ? (rawDuration % 2 ? -(rawDuration + 1) / 2 : rawDuration / 2) / 1000 : 0 };
  if (!clean(meta.title) || !clean(meta.album) || !meta.artists.length || meta.artists.some(a => !clean(a)) || meta.duration <= 0 || meta.duration > 86400) throw new Error("metadata-incomplete");
  const flag = last(fs, 18, 0);
  if (fs.some(f => f.number === 18 && f.wire !== 0) || (flag && ![0, 1].includes(flag.value))) throw new Error("metadata-lyrics-flag");
  // spotify.metadata.Track is proto2: an omitted optional bool is false.
  // Native no-lyrics tracks can omit this field entirely instead of sending 0.
  return { meta, fs, hasLyrics: flag?.value === 1, hasLyricsField: Boolean(flag) };
}
// Only the documented TRACK_V4 Any payload is parsed. Other extensions remain
// opaque, including audio/playability/account data and all unknown wire fields.
function extendedTracks(bytes) {
  const root = fields(bytes), records = [];
  for (const group of root.filter(f => f.number === 2 && f.wire === 2)) {
    const groupFields = fields(group.payload);
    if (last(groupFields, 2, 0)?.value !== 10) continue;
    const groupHeader = last(groupFields, 1, 2);
    if (groupHeader && ![0, 200].includes(last(fields(groupHeader.payload), 1, 0)?.value ?? 0)) continue;
    for (const entity of groupFields.filter(f => f.number === 3 && f.wire === 2)) {
      const entityFields = fields(entity.payload), uri = word(entityFields, 2);
      const id = /^spotify:track:([0-9A-Za-z]{22})$/.exec(uri)?.[1];
      const entityHeader = last(entityFields, 1, 2);
      if (!id || (entityHeader && ![0, 200].includes(last(fields(entityHeader.payload), 1, 0)?.value ?? 0))) continue;
      const any = last(entityFields, 3, 2); if (!any) continue;
      const anyFields = fields(any.payload), type = word(anyFields, 1), payload = last(anyFields, 2, 2);
      if (!/(?:^|\/)spotify\.metadata\.Track$/.test(type) || !payload) continue;
      // A corrupt individual track cannot prevent other tracks being cached.
      try {
        const parsed = parseMetadata(payload.payload, base62Hex(id));
        records.push({ ...parsed, group, groupFields, entity, entityFields, anyFields });
        if (records.length > 100) throw new Error("extended-track-limit");
      } catch (e) { if (e.message === "extended-track-limit") throw e; }
    }
  }
  return { records,
    writeFlags(selected) {
      const entities = new Map(), groups = new Map();
      for (const record of selected) {
        const track = replaceField(record.fs, 18, numberField(18, 1));
        const any = replaceField(record.anyFields, 2, dataField(2, track));
        let value = replaceField(record.entityFields, 3, dataField(3, any));
        const header = last(record.entityFields, 1, 2);
        if (header) {
          let h = replaceField(fields(header.payload), 2, null); // Discard the old entity ETag.
          h = replaceField(fields(h), 4, numberField(4, 300));
          h = replaceField(fields(h), 5, numberField(5, 0));
          value = replaceField(fields(value), 1, dataField(1, h));
        }
        entities.set(record.entity, dataField(3, value)); groups.set(record.group, record.groupFields);
      }
      const replacements = new Map();
      for (const [group, fs] of groups) {
        let value = join(fs.map(f => entities.get(f) || f.raw));
        const header = last(fs, 1, 2);
        if (header) {
          let h = replaceField(fields(header.payload), 2, numberField(2, 300));
          h = replaceField(fields(h), 3, numberField(3, 0));
          value = replaceField(fields(value), 1, dataField(1, h));
        }
        replacements.set(group, dataField(2, value));
      }
      return join(root.map(f => replacements.get(f) || f.raw));
    }
  };
}
function settings(env = {}) {
  const provider = str(env.FALLBACK_PROVIDER) || "auto";
  const language = str(env.TARGET_LANGUAGE) || "zh-CN";
  if (!LANGUAGES.includes(language) || !["auto", "off", ...Object.keys(SOURCES)].includes(provider)) throw new Error("settings-invalid");
  return { translate: env.TRANSLATION_ENABLED == null || env.TRANSLATION_ENABLED === "" ? true : truth(env.TRANSLATION_ENABLED), language, provider, discover: env.DISCOVER_MISSING == null || env.DISCOVER_MISSING === "" ? true : truth(env.DISCOVER_MISSING) };
}
function loadCache(ctx, scope) {
  let loaded = false, entries = [], cooldowns = {}, initialCooldowns = "{}", compact = false;
  const pending = new Map(), costs = new WeakMap(); let total = 64;
  // Keep other songs out of the live heap while a native HTTP call is pending.
  // Saving still merges against the complete bounded store, never this view alone.
  function relevant(e) {
    if (!scope) return true;
    const key = str(e?.key);
    if (scope.metadata) return key.startsWith("meta:") || key.startsWith("availability:");
    return key.endsWith(":" + scope.track) || key.startsWith("source-order:v1:") || key.startsWith("translation:" + scope.language + ":");
  }
  function overhead() { return JSON.stringify({entries:[],cooldowns}).length; }
  function mergeCooldowns(value) {
    if (!goodObject(value)) return;
    for (const host of Object.keys(value)) {
      if (host.length > 253 || !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(host)) continue;
      const until = value[host];
      if (!Number.isFinite(until) || until <= Date.now()) continue;
      if (!Object.hasOwn(cooldowns, host) && Object.keys(cooldowns).length >= 16) continue;
      cooldowns[host] = Math.max(cooldowns[host] || 0, Math.min(until, Date.now() + 86400000));
    }
  }
  function cost(e) { if (!costs.has(e)) costs.set(e, JSON.stringify(e).length + 1); return costs.get(e); }
  function read() {
    let value;
    try {
      if (typeof ctx.storage.get === "function") { const raw = ctx.storage.get(KEY); if (typeof raw === "string" && raw.length <= 128000) value = JSON.parse(raw); }
      else value = ctx.storage.getJSON(KEY);
    } catch { }
    return goodObject(value) ? value : {};
  }
  function combineTranslations(a,b) {
    if (!a || !b.key.startsWith("translations:v1:") || !Array.isArray(a.value?.pairs) || !Array.isArray(b.value?.pairs)) return null;
    const newest = a.expires > b.expires ? a : b, older = newest === a ? b : a;
    const pairs = [], seen = new Set(); let size = JSON.stringify({...newest,value:{pairs:[]}}).length;
    for (const record of [newest,older]) for (const pair of record.value.pairs.slice(0,MAX_LINES)) {
      if (!Array.isArray(pair) || pair.length !== 2 || pair.some(s => typeof s !== "string") || seen.has(pair[0])) continue;
      const length = JSON.stringify(pair).length + 1;
      if (pairs.length >= MAX_LINES || size + length > CACHE_LIMIT / 2) continue;
      size += length; pairs.push(pair); seen.add(pair[0]);
    }
    return {...newest,value:{pairs}};
  }
  function bounded(input) {
    const kept = [], seen = new Set(); let size = overhead();
    for (let i = input.length - 1; i >= 0 && kept.length < CACHE_COUNT; i--) {
      const e = input[i];
      if (!goodObject(e) || typeof e.key !== "string" || !Number.isFinite(e.expires) || e.expires <= Date.now() || seen.has(e.key)) continue;
      let length; try { length = cost(e); } catch { continue; }
      if (length > CACHE_LIMIT / 2 || size + length > CACHE_LIMIT) continue;
      size += length; seen.add(e.key); kept.push(e);
    }
    return kept.reverse();
  }
  function ensure() {
    if (loaded) return; loaded = true;
    const data = read(), original = Array.isArray(data.entries) ? data.entries : [];
    mergeCooldowns(data.cooldowns);
    entries = bounded(scope ? original.filter(relevant) : original);
    total = overhead() + entries.reduce((n,e) => n + cost(e), 0);
    compact = !scope && entries.length !== original.length;
    initialCooldowns = JSON.stringify(cooldowns);
  }
  return {
    get entries() { ensure(); return entries; },
    get cooldowns() { ensure(); return cooldowns; },
    get(key) { ensure(); for (let i = entries.length - 1; i >= 0; i--) if (entries[i].key === key && entries[i].expires > Date.now()) return entries[i].value; },
    put(key, value, ttl = 86400000, expires = Date.now() + ttl) {
      ensure(); const entry = { key, value, expires };
      let length; try { length = cost(entry); } catch { return; }
      if (length > CACHE_LIMIT / 2) return;
      const old = entries.findIndex(e => e.key === key);
      if (old >= 0) { total -= cost(entries[old]); entries.splice(old, 1); }
      entries.push(entry); pending.set(key, entry); total += length;
      total = overhead() + entries.reduce((n,e) => n + cost(e), 0);
      while (entries.length > CACHE_COUNT || total > CACHE_LIMIT) { const e = entries.shift(); total -= cost(e); pending.delete(e.key); }
    },
    save() {
      // Card-only and unchanged responses never load or rewrite the lyric cache.
      if (!loaded || (!compact && !pending.size && initialCooldowns === JSON.stringify(cooldowns))) return;
      try {
        const latest = read();
        const merged = new Map();
        for (const e of bounded(Array.isArray(latest.entries) ? latest.entries : [])) merged.set(e.key, e);
        for (const e of pending.values()) {
          if (!goodObject(e) || typeof e.key !== "string" || !Number.isFinite(e.expires) || e.expires <= Date.now()) continue;
          const combined = combineTranslations(merged.get(e.key),e);
          if (combined || !merged.has(e.key) || merged.get(e.key).expires <= e.expires) { merged.delete(e.key); merged.set(e.key, combined || e); }
        }
        // Include cooldown metadata in the same serialized storage limit.
        for (const host of Object.keys(cooldowns)) if (cooldowns[host] <= Date.now()) delete cooldowns[host];
        mergeCooldowns(latest.cooldowns);
        const complete = bounded([...merged.values()]);
        ctx.storage.setJSON(KEY, { entries: complete, cooldowns });
        entries = scope ? complete.filter(relevant) : complete;
        total = overhead() + entries.reduce((n,e) => n + cost(e), 0);
        pending.clear(); compact = false; initialCooldowns = JSON.stringify(cooldowns);
      } catch { }
    }
  };
}
function status(ctx, message) {
  try {
    const url = str(ctx.request?.url), lyric = LYRIC_URL.exec(url);
    const event = { message, at: new Date().toISOString(), version: VERSION,
      route: lyric ? "lyrics" : "manual",
      ...(lyric ? { trackId: lyric[2] } : {}), ...(ctx.response ? { httpStatus: ctx.response.status } : {}) };
    const recent = ctx.storage.getJSON(EVENTS), previous = Array.isArray(recent) ? recent[recent.length - 1] : null;
    const age = previous ? Date.parse(event.at) - Date.parse(previous.at) : Infinity;
    if (age >= 0 && age < 15000 && ["message","version","route","trackId","httpStatus"].every(k => previous[k] === event[k])) return;
    ctx.storage.setJSON(EVENTS, [...(Array.isArray(recent) ? recent : []).slice(-7), event]);
    ctx.storage.setJSON(STATUS, event);
  } catch { }
}
function cooldown(resp, cache, host) {
  if ([500,502,504].includes(resp.status)) { cache.cooldowns[host] = Math.max(cache.cooldowns[host] || 0,Date.now() + 15000); return; }
  if (![429, 503].includes(resp.status)) return;
  const value = header(resp.headers, "Retry-After"), seconds = Number(value);
  const delay = value && Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - Date.now();
  cache.cooldowns[host] = Date.now() + Math.min(86400000, Math.max(30000, Number.isFinite(delay) ? delay : 60000));
}
async function readBody(resp, maxBytes = BODY_LIMIT) {
  if (Number(header(resp.headers,"Content-Length")) > maxBytes) throw new Error("body-limit");
  // Callback hosts expose a bounded, lazy byte view. Egern uses its documented
  // arrayBuffer API; both paths check byte size before text/JSON decoding.
  if (typeof resp.boundedBytes !== "function" && typeof resp.body?.getReader === "function") {
    const reader = resp.body.getReader(), parts = []; let size = 0;
    try {
      for (;;) {
        const chunk = await reader.read(); if (chunk.done) break;
        const value = chunk.value;
        if (!ArrayBuffer.isView(value)) throw new Error("body-shape");
        size += value.byteLength;
        if (size > maxBytes || parts.length >= 128) { const error = new Error("body-limit"); error.bodyBytes = size; throw error; }
        parts.push(new Uint8Array(value.buffer,value.byteOffset,value.byteLength));
      }
      return parts.length === 1 ? parts[0] : join(parts);
    } catch (error) { try { await reader.cancel(); } catch { } throw error; }
    finally { reader.releaseLock(); }
  }
  const value = typeof resp.boundedBytes === "function" ? resp.boundedBytes(maxBytes) : await resp.arrayBuffer();
  const bytes = ArrayBuffer.isView(value) ? new Uint8Array(value.buffer,value.byteOffset,value.byteLength) : new Uint8Array(value);
  if (bytes.length > maxBytes) { const error = new Error("body-limit"); error.bodyBytes = bytes.length; throw error; }
  return bytes;
}
// Shared advisory admission control: persistent storage has no atomic CAS.
// No wait queue, tokens or response bodies are stored. Cache-only work is free.
function networkLease(ctx, deadline) {
  const key = "VerseLyrics.v1.network", owner = Date.now().toString(36) + Math.random().toString(36).slice(2);
  let acquired = false, stalled = false;
  function active() {
    const rows = ctx.storage.getJSON(key);
    return (Array.isArray(rows) ? rows.slice(-2) : []).filter(r => typeof r?.owner === "string" && r.owner.length <= 64 && Number.isFinite(r.expires) && r.expires > Date.now() && r.expires <= Date.now()+15000);
  }
  return {
    enter() {
      if (stalled) throw new Error("transport-pending");
      try {
        let rows = active();
        if (acquired) { if (!rows.some(r => r.owner === owner)) throw new Error("network-busy"); return; }
        if (rows.length >= 2) throw new Error("network-busy");
        ctx.storage.setJSON(key,[...rows,{owner,expires:deadline+2000}]);
        if (!active().some(r => r.owner === owner)) throw new Error("network-busy");
        acquired = true;
      } catch { throw new Error("network-busy"); }
    },
    defer() { stalled = true; },
    release() {
      // A host timeout need not cancel its native request. Let that slot expire
      // instead of immediately admitting another request on top of it.
      if (!acquired || stalled) return;
      try { ctx.storage.setJSON(key,active().filter(r => r.owner !== owner)); } catch { }
      acquired = false;
    }
  };
}
// Track lyric responses, not a claim about the app's current playback state.
// A newer track stops older jobs from starting additional HTTP. Already running
// native requests finish normally; no timer, cancellation API or wait queue.
function lyricWork(ctx, id) {
  const key = "VerseLyrics.v1.latest", now = Date.now();
  let generation;
  try {
    const previous = ctx.storage.getJSON(key);
    generation = previous?.id === id && typeof previous.generation === "string" && previous.generation.length <= 64 && previous.expires > now && previous.expires <= now + 15000
      ? previous.generation : now.toString(36) + Math.random().toString(36).slice(2);
    ctx.storage.setJSON(key, { id, generation, expires: now + 15000 });
  } catch { return { check() {} }; }
  return { check() {
    let latest; try { latest = ctx.storage.getJSON(key); } catch { return; }
    if (latest?.generation && latest.generation !== generation && latest.expires > Date.now() && latest.expires <= Date.now() + 15000) throw new Error("work-superseded");
  } };
}
async function http(ctx, url, state, options = {}, allowMissing = false) {
  state.work?.check();
  const host = /^https:\/\/([^/]+)\//.exec(url)?.[1];
  if (!host || state.cache.cooldowns[host] > Date.now()) throw new Error("cooldown");
  const remaining = state.deadline - Date.now();
  if (remaining < 250) throw new Error("deadline");
  const budget = state.sourceBudget, attempt = state.attemptBudget;
  if (budget && (budget.requests >= SOURCE_REQUEST_LIMIT || budget.bytes >= SOURCE_BYTE_LIMIT)) throw new Error("source-budget");
  if (attempt && attempt.requests >= attempt.limit) throw new Error("source-budget");
  const maxBytes = Math.min(LIMIT, options.maxBytes || SERVICE_LIMIT, budget ? SOURCE_BYTE_LIMIT - budget.bytes : LIMIT);
  const {maxBytes: ignored, ...requestOptions} = options;
  const common = { ...requestOptions, timeout: Math.min(2500, remaining), redirect: "error", credentials: "omit", insecureTls: false };
  if (budget) budget.requests++; if (attempt) attempt.requests++;
  state.network?.enter();
  let resp;
  try { resp = options.body === undefined ? await ctx.http.get(url, common) : await ctx.http.post(url, common); }
  catch (error) {
    // Fast track changes must not repeatedly launch the same failing transport.
    // This also gives non-cancellable native requests time to finish quietly.
    state.cache.cooldowns[host] = Math.max(state.cache.cooldowns[host] || 0, Date.now() + 15000);
    if (state.network && (error.pendingTransport || /timeout|timed out|abort/i.test(str(error.message)))) {
      state.network.defer(); throw new Error("transport-pending");
    }
    throw error;
  }
  cooldown(resp, state.cache, host);
  if ((resp.status < 200 || resp.status >= 300) && !(allowMissing && resp.status === 404)) throw new Error("http-" + resp.status);
  if (Number(header(resp.headers, "Content-Length")) > maxBytes) { try { await resp.body?.cancel?.(); } catch { } throw new Error("service-body-limit"); }
  let bytes;
  try { bytes = await readBody(resp,maxBytes); }
  catch (error) { if (budget && Number.isFinite(error.bodyBytes)) budget.bytes += error.bodyBytes; if (error.message === "body-limit") throw new Error("service-body-limit"); throw error; }
  if (budget) budget.bytes += bytes.length;
  if (bytes.length > maxBytes) throw new Error("service-body-limit");
  return { bytes, headers: resp.headers, status: resp.status };
}
async function json(ctx, url, state, options) { return JSON.parse(text((await http(ctx, url, state, options)).bytes)); }
const query = params => Object.entries(params).map(([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(String(v))).join("&");
function artists(names) {
  return [...new Set(names.flatMap(s => clean(s).split(/\s*(?:;|；|、|,|，|&|\/|\bfeat\.?|\bfeaturing\b)\s*/i)).map(metadataNormal).filter(Boolean))].sort();
}
function matches(meta, candidate) {
  return metadataNormal(meta.title) === metadataNormal(candidate.title) && metadataNormal(meta.album) === metadataNormal(candidate.album) &&
    JSON.stringify(artists(meta.artists)) === JSON.stringify(artists(candidate.artists)) &&
    Number.isFinite(candidate.duration) && Math.abs(meta.duration - candidate.duration) <= 2;
}
function sourceCandidates(meta, records, metadataOf, sameEvidence) {
  const exact = [], equivalent = [];
  const title = metadataNormal(meta.title), singer = JSON.stringify(artists(meta.artists));
  for (const record of records) {
    if (!goodObject(record)) continue;
    let candidate; try { candidate = metadataOf(record); } catch { continue; }
    if (matches(meta, candidate)) exact.push(record);
    else if (title && singer !== "[]" && title === metadataNormal(candidate.title) && singer === JSON.stringify(artists(candidate.artists)) &&
      Number.isFinite(candidate.duration) && Math.abs(meta.duration - candidate.duration) <= 1 &&
      !alternateVersion(meta.album) && !alternateVersion(candidate.album)) equivalent.push(record);
  }
  // A single/compilation/localized album name can differ for the same recording.
  // Only a unique title+artist+duration candidate may relax album equality.
  if (exact.length) return exact;
  if (equivalent.length === 1) return equivalent;
  // LRCLIB can repeat the identical timed/plain document across compilations.
  // Only byte-identical lyric evidence plus identical duration resolves that
  // ambiguity. Other providers still require a unique catalog candidate.
  return equivalent.length > 1 && typeof sameEvidence === "function" && equivalent.every(r => sameEvidence(equivalent[0], r)) ? [equivalent[0]] : [];
}
function alternateVersion(album) { return /(?:\blive\b|\bconcert\b|\bremix\b|\bremaster(?:ed)?\b|\bacoustic\b|\bdemo\b|\bkaraoke\b|\binstrumental\b|现场|現場|演唱会|演唱會|伴奏|翻唱)/i.test(clean(album)); }
function sourceSearch(meta, compact = false) {
  // Kuwo's search loses the relevant result for long soundtrack subtitles and
  // all credited performers. Broaden only the query; matching still uses every
  // original title/version, artist, album and duration field below.
  const title = compact ? meta.title.replace(/\s+[-–—]\s+.*$|[（(].*$|-《.*$/u, "").trim() || meta.title : meta.title;
  const value = title + " " + (compact ? meta.artists[0] : meta.artists.join(" "));
  return foldHan(value);
}
function lyricBase64(value) {
  // Decode only the small UTF-8 LRC format, never compressed KRC. No atob,
  // binary string, decompressor or unbounded temporary number array is needed.
  if (typeof value !== "string" || value.length > 87384 || value.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw new Error("lyric-base64");
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  const size = value.length / 4 * 3 - padding;
  if (size < 0 || size > 65536) throw new Error("lyrics-limit");
  const out = new Uint8Array(size), alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let at = 0;
  for (let i = 0; i < value.length; i += 4) {
    const a = alphabet.indexOf(value[i]), b = alphabet.indexOf(value[i + 1]);
    const c = value[i + 2] === "=" ? 0 : alphabet.indexOf(value[i + 2]);
    const d = value[i + 3] === "=" ? 0 : alphabet.indexOf(value[i + 3]);
    if (a < 0 || b < 0 || c < 0 || d < 0 || (i + 4 === value.length && ((padding === 2 && (b & 15)) || (padding === 1 && (c & 3))))) throw new Error("lyric-base64");
    out[at++] = (a << 2) | (b >> 4);
    if (at < size) out[at++] = (b << 4) | (c >> 2);
    if (at < size) out[at++] = (c << 6) | d;
  }
  return text(out);
}
async function kugouLyrics(ctx, meta, state) {
  if (alternateVersion(meta.album)) return null;
  const data = await json(ctx, "https://lyrics.kugou.com/search?" + query({ver:1,man:"yes",client:"pc",keyword:sourceSearch(meta),duration:Math.round(meta.duration * 1000)}), state, {maxBytes:NEW_SOURCE_LIMIT});
  if (data.status !== 200 || !Array.isArray(data.candidates)) throw new Error("kugou-format");
  const groups = new Map(), title = metadataNormal(meta.title), singer = JSON.stringify(artists(meta.artists));
  for (const r of data.candidates) {
    if (!goodObject(r) || !/^[0-9]{1,20}$/.test(String(r.id)) || !/^[A-Za-z0-9_-]{1,128}$/.test(str(r.accesskey)) ||
      title !== metadataNormal(r.song) || singer !== JSON.stringify(artists([r.singer])) ||
      !Number.isFinite(r.duration) || Math.abs(meta.duration - r.duration / 1000) > 1) continue;
    // Multiple uploads with the same recording duration are not multiple songs.
    // Distinct matching durations stay ambiguous because this API has no album.
    if (!groups.has(r.duration)) groups.set(r.duration, []);
    const group = groups.get(r.duration); if (group.length < 2) group.push(r);
  }
  if (groups.size !== 1) return null;
  for (const r of groups.values().next().value) {
    const result = await json(ctx, "https://lyrics.kugou.com/download?" + query({ver:1,client:"pc",id:r.id,accesskey:r.accesskey,fmt:"lrc",charset:"utf8"}), state, {maxBytes:NEW_SOURCE_LIMIT});
    if (result.status !== 200 || (result.id != null && String(result.id) !== String(r.id)) || (result.fmt && result.fmt !== "lrc") || (result.charset && !/^utf-?8$/i.test(result.charset))) continue;
    const doc = fallbackDoc("kugou", lyricBase64(result.content), ""); if (doc) return doc;
  }
  return null;
}
async function kuwoLyrics(ctx, meta, state) {
  const headers = {Referer:"https://www.kuwo.cn/"};
  const data = await json(ctx, "https://search.kuwo.cn/r.s?" + query({all:sourceSearch(meta,true),ft:"music",pn:0,rn:8,rformat:"json",encoding:"utf8",pcjson:1}), state, {headers,maxBytes:NEW_SOURCE_LIMIT});
  if (!Array.isArray(data.abslist)) throw new Error("kuwo-format");
  const songs = sourceCandidates(meta, data.abslist, s => ({title:entities(s.SONGNAME || s.NAME),artists:[entities(s.ARTIST)],album:entities(s.ALBUM),duration:Number(s.DURATION)}));
  for (const song of songs.slice(0, 2)) {
    const id = /^MUSIC_([0-9]{1,20})$/.exec(str(song.MUSICRID))?.[1]; if (!id) continue;
    const result = await json(ctx, "https://www.kuwo.cn/openapi/v1/www/lyric/getlyric?" + query({musicId:id}), state, {headers,maxBytes:NEW_SOURCE_LIMIT});
    const info = result.data?.songinfo, rows = result.data?.lrclist;
    if (result.code !== 200 || result.success !== true || !Array.isArray(rows) || rows.length > MAX_LINES) continue;
    // The open API normally has only lrclist; the selected numeric ID was
    // already checked against catalog metadata. Validate extra identity if sent.
    if (info != null && (!goodObject(info) || String(info.id) !== id ||
      (clean(info.songName) && metadataNormal(info.songName) !== metadataNormal(meta.title)) ||
      (clean(info.artist) && JSON.stringify(artists([info.artist])) !== JSON.stringify(artists(meta.artists))) ||
      (Number(info.duration) > 0 && Math.abs(Number(info.duration) - meta.duration) > 2))) continue;
    const lines = [];
    for (const row of rows) {
      if (!goodObject(row) || typeof row.lineLyric !== "string" || !/^(?:\d+)(?:\.\d+)?$/.test(str(row.time)) || !Number.isFinite(Number(row.time)) || Number(row.time) > meta.duration + 5) continue;
      lines.push({startTimeMs:String(Math.round(Number(row.time) * 1000)),words:entities(row.lineLyric),syllables:[],endTimeMs:"0"});
    }
    lines.sort((a,b) => Number(a.startTimeMs) - Number(b.startTimeMs));
    const doc = sourceDocument("kuwo", lines, lines.some(l => Number(l.startTimeMs) > 0)); if (doc) return doc;
  }
  return null;
}
async function ovhLyrics(ctx, meta, state) {
  const options = {maxBytes:NEW_SOURCE_LIMIT};
  const data = await json(ctx, "https://api.lyrics.ovh/suggest/" + encodeURIComponent(meta.title + " " + meta.artists.join(" ")), state, options);
  if (!Array.isArray(data.data)) throw new Error("lyricsovh-format");
  const songs = sourceCandidates(meta, data.data, s => ({title:s.title,artists:[s.artist?.name],album:s.album?.title,duration:s.duration}));
  if (!songs.length) return null;
  const song = songs[0];
  const response = await http(ctx, "https://api.lyrics.ovh/v1/" + encodeURIComponent(song.artist.name) + "/" + encodeURIComponent(song.title), state, options, true);
  if (response.status === 404) return null;
  const result = JSON.parse(text(response.bytes));
  if (typeof result.lyrics !== "string") throw new Error("lyricsovh-format");
  // This service does not supply timing; never fabricate scrolling timestamps.
  return fallbackDoc("lyricsovh", "", result.lyrics);
}
function entities(s) {
  return str(s).replace(/&(?:#(x[0-9a-f]+|\d+)|(amp|lt|gt|quot|apos));/gi, (all, n, name) => {
    if (name) return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[name.toLowerCase()];
    const value = n[0].toLowerCase() === "x" ? parseInt(n.slice(1), 16) : Number(n);
    return Number.isInteger(value) && value > 0 && value <= 0x10ffff && !(value >= 0xd800 && value <= 0xdfff) ? String.fromCodePoint(value) : all;
  });
}
function lrc(input) {
  const source = entities(input).replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  if (source.length > 60000) throw new Error("lyrics-limit");
  let offset = 0;
  for (const m of source.matchAll(/\[offset:\s*(-?\d+)\s*\]/gi)) offset = Math.max(-600000, Math.min(600000, Number(m[1])));
  const rows = []; let tagCount = 0;
  for (const line of source.split("\n")) {
    const tags = [];
    for (const tag of line.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)) {
      if (++tagCount > MAX_LINES * 2) throw new Error("line-limit"); tags.push(tag);
    }
    if (!tags.length) continue;
    const words = line.slice(tags.at(-1).index + tags.at(-1)[0].length).replace(/<\d{1,3}:\d{2}(?:\.\d{1,3})?>/g, "");
    for (const t of tags) {
      if (Number(t[2]) >= 60) continue;
      const start = Math.max(0, Number(t[1]) * 60000 + Number(t[2]) * 1000 + Number((t[3] || "").padEnd(3, "0")) + offset);
      rows.push({ startTimeMs: String(start), words, syllables: [], endTimeMs: "0" });
    }
  }
  rows.sort((a, b) => Number(a.startTimeMs) - Number(b.startTimeMs));
  const merged = [];
  for (const row of rows) {
    const prev = merged.at(-1);
    if (prev && prev.startTimeMs === row.startTimeMs) { if (row.words && row.words !== prev.words) prev.words += (prev.words ? "\n" : "") + row.words; }
    else merged.push(row);
  }
  if (merged.length > MAX_LINES) throw new Error("line-limit");
  return merged;
}
function fallbackDoc(provider, synced, plain) {
  let lines = lrc(synced), timed = lines.some(l => Number(l.startTimeMs) > 0);
  if (!lines.some(l => clean(l.words))) {
    lines = clean(entities(plain)).split(/\r?\n/).filter(s => clean(s)).map(words => ({ startTimeMs: "0", words, syllables: [], endTimeMs: "0" }));
    timed = false;
  }
  return sourceDocument(provider, lines, timed);
}
function sourceDocument(provider, lines, timed) {
  if (!lines.length || lines.length > MAX_LINES || !lines.some(l => clean(l.words))) return null;
  return { lyrics: { syncType: timed ? "LINE_SYNCED" : "UNSYNCED", lines, provider,
    providerLyricsId: "", providerDisplayName: SOURCES[provider], syncLyricsUri: "", isDenseTypeface: false,
    alternatives: [], language: "", isRtlLanguage: false },
    colors: { ...NEUTRAL_PALETTE }, hasVocalRemoval: false };
}
async function sourceLyrics(ctx, provider, meta, state) {
  if (!goodObject(meta) || !clean(meta.title) || str(meta.title).length > 1024 || str(meta.album).length > 1024 ||
    !Array.isArray(meta.artists) || !meta.artists.length || meta.artists.length > 32 || meta.artists.some(a => !clean(a) || a.length > 256) ||
    !Number.isFinite(meta.duration) || meta.duration <= 0 || meta.duration > 86400) throw new Error("metadata-limit");
  if (provider === "kugou") return kugouLyrics(ctx, meta, state);
  if (provider === "kuwo") return kuwoLyrics(ctx, meta, state);
  if (provider === "lyricsovh") return ovhLyrics(ctx, meta, state);
  if (provider === "lrclib") {
    const headers = { "User-Agent": "VerseLyrics/" + VERSION + " (https://github.com/hhhoratioxu/Proxy)" };
    const details = { track_name: meta.title, artist_name: meta.artists.join(" ") };
    // Fetch one signature match first; search responses can repeat full lyric
    // and word-timing documents for many records and are substantially larger.
    const direct = await http(ctx, "https://lrclib.net/api/get?" + query({...details,album_name:meta.album,duration:meta.duration}), state, {headers}, true);
    if (direct.status === 200) {
      const record = JSON.parse(text(direct.bytes));
      if (goodObject(record) && matches(meta, {title:record.trackName,artists:[record.artistName],album:record.albumName,duration:record.duration})) {
        const result = fallbackDoc(provider, str(record.syncedLyrics), str(record.plainLyrics)); if (result) return result;
      }
    }
    // Search without the album filter so reissues and localized album names can
    // be checked, still rejecting ambiguous/wrong-artist/version candidates.
    const data = await json(ctx, "https://lrclib.net/api/search?" + query(details), state, {headers});
    if (!Array.isArray(data)) throw new Error("lrclib-format");
    const available = data.filter(r => goodObject(r) && (clean(r.syncedLyrics) || clean(r.plainLyrics)));
    for (const record of sourceCandidates(meta, available, record => ({title:record.trackName,artists:[record.artistName],album:record.albumName,duration:record.duration}),
      (a,b) => a.duration === b.duration && (clean(a.syncedLyrics) ? a.syncedLyrics === b.syncedLyrics : !clean(b.syncedLyrics) && a.plainLyrics === b.plainLyrics))) {
      const result = fallbackDoc(provider, str(record.syncedLyrics), str(record.plainLyrics));
      if (result) return result;
    }
    return null;
  }
  if (provider === "qq") {
    const headers = { Referer: "https://y.qq.com/" };
    const data = await json(ctx, "https://c.y.qq.com/soso/fcgi-bin/client_search_cp?" + query({ w: meta.title + " " + meta.artists.join(" "), format: "json", n: 10, p: 1, t: 0 }), state, { headers });
    if (data.code !== 0 || !Array.isArray(data.data?.song?.list)) throw new Error("qq-format");
    const songs = sourceCandidates(meta, data.data.song.list, s => ({ title: s.songname, artists: (s.singer || []).map(a => a.name), album: s.albumname, duration: s.interval }));
    for (const song of songs.slice(0, 2)) {
      if (!/^[0-9A-Za-z]{1,32}$/.test(song.songmid)) continue;
      const lyrics = await json(ctx, "https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?" + query({ songmid: song.songmid, format: "json", nobase64: 1, g_tk: 5381 }), state, { headers });
      if ((lyrics.retcode ?? lyrics.code) !== 0) continue;
      const result = fallbackDoc(provider, str(lyrics.lyric), "");
      if (result) return result;
    }
    return null;
  }
  if (provider !== "netease") throw new Error("provider-invalid");
  const headers = { Referer: "https://music.163.com/", "Content-Type": "application/x-www-form-urlencoded" };
  const data = await json(ctx, "https://music.163.com/api/cloudsearch/pc", state, { headers,
    body: query({ s: meta.title + " " + meta.artists.join(" "), type: 1, limit: 15, offset: 0 }) });
  if (data.code !== 200 || !Array.isArray(data.result?.songs)) throw new Error("netease-format");
  const songs = sourceCandidates(meta, data.result.songs, s => ({ title: s.name, artists: (s.ar || []).map(a => a.name), album: s.al?.name, duration: s.dt / 1000 }));
  for (const song of songs.slice(0, 2)) {
    if (!Number.isSafeInteger(song.id) || song.id <= 0) continue;
    const lyrics = await json(ctx, "https://music.163.com/api/song/lyric?" + query({ id: song.id, lv: -1, kv: -1, tv: -1 }), state, { headers: { Referer: headers.Referer } });
    if (lyrics.code !== 200) continue;
    const result = fallbackDoc(provider, str(lyrics.lrc?.lyric), "");
    if (result) return result;
  }
  return null;
}
function packLyrics(doc) {
  const lyrics = doc?.lyrics;
  if (!goodObject(lyrics) || !Object.hasOwn(SOURCES, lyrics.provider) || !["LINE_SYNCED","UNSYNCED"].includes(lyrics.syncType) ||
    !Array.isArray(lyrics.lines) || !lyrics.lines.length || lyrics.lines.length > MAX_LINES || lyrics.lines.some(l =>
      typeof l?.words !== "string" || !Number.isSafeInteger(Number(l.startTimeMs)) || Number(l.startTimeMs) < 0 || Number(l.startTimeMs) > 86400000 ||
      (l.syllables?.length || 0) > 0 || Number(l.endTimeMs || 0) !== 0)) return null;
  return {v:1,p:lyrics.provider,t:lyrics.syncType === "LINE_SYNCED",l:lyrics.lines.map(l => [Number(l.startTimeMs),l.words])};
}
function cachedBackup(state, id) {
  const key = "lyrics:" + state.settings.provider + ":" + id;
  const cached = state.cache.get(key);
  if (cached?.v === 1 && Object.hasOwn(SOURCES,cached.p) && typeof cached.t === "boolean" && Array.isArray(cached.l) && cached.l.length && cached.l.length <= MAX_LINES &&
    cached.l.every(row => Array.isArray(row) && row.length === 2 && Number.isSafeInteger(row[0]) && row[0] >= 0 && row[0] <= 86400000 && typeof row[1] === "string"))
    return sourceDocument(cached.p,cached.l.map(([start,words]) => ({startTimeMs:String(start),words,syllables:[],endTimeMs:"0"})),cached.t) || undefined;
  if (goodObject(cached) && Array.isArray(cached.lyrics?.lines)) {
    const packed = packLyrics(cached), expires = state.cache.entries.find(e => e.key === key)?.expires;
    if (packed && expires > Date.now()) state.cache.put(key,packed,0,expires);
    return cached;
  }
  if (cached?.missing === true && cached.sourceRevision === SOURCE_REVISION) { state.attempts = cached.attempts || []; return null; }
}
function sourceHintKey(meta) {
  if (!Array.isArray(meta?.artists) || !meta.artists.length || meta.artists.length > 32) return null;
  const names = meta.artists.map(metadataNormal).sort();
  if (names.some(n => !n)) return null;
  const key = "source-order:v1:" + JSON.stringify(names);
  return key.length <= 512 ? key : null;
}
function sourceOrder(meta, state) {
  if (state.settings.provider !== "auto") return [state.settings.provider];
  const order = ["lrclib", "qq", "netease", "kugou", "kuwo", "lyricsovh"];
  const key = sourceHintKey(meta), hint = key && state.cache.get(key);
  // A hint changes search order only. Each new song still passes the full
  // title/artist/duration/version checks, and all other sources remain eligible.
  if (order.includes(hint) && hint !== "lyricsovh") return [hint, ...order.filter(p => p !== hint)];
  return order;
}
async function backup(ctx, meta, state) {
  if (state.settings.provider === "off") return null;
  const key = "lyrics:" + state.settings.provider + ":" + meta.id;
  const cached = cachedBackup(state,meta.id); if (cached !== undefined) return cached;
  state.attempts = [];
  const providers = sourceOrder(meta,state);
  const sourceBudget = {requests:0,bytes:0}; state.sourceUsage = sourceBudget;
  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    try {
      // Reserve time for the remaining sources; a slow first source must not
      // consume the entire request deadline before the remaining sources run.
      const budget = Math.min(6500, Math.max(250, (state.deadline - Date.now() - 1500) / (providers.length - i)));
      const limit = Math.max(1, Math.floor((SOURCE_REQUEST_LIMIT - sourceBudget.requests) / (providers.length - i)));
      const doc = await sourceLyrics(ctx, provider, meta, {...state, sourceBudget, attemptBudget:{requests:0,limit}, deadline:Math.min(state.deadline, Date.now() + budget)});
      state.attempts.push({ provider, result: doc ? "matched" : "no-match" });
      if (doc) {
        state.cache.put(key, packLyrics(doc) || doc);
        const hint = state.settings.provider === "auto" && doc.lyrics.syncType === "LINE_SYNCED" && sourceHintKey(meta);
        if (hint && state.cache.get(hint) !== provider) state.cache.put(hint,provider,6 * 3600000);
        return doc;
      }
    } catch (e) {
      if (["network-busy","transport-pending","work-superseded"].includes(e.message)) { state.networkDeferred = true; return null; }
      const reason = /^(?:http-\d{3}|cooldown|deadline|source-budget|service-body-limit)$/.test(str(e.message)) ? e.message : "request-or-format";
      state.attempts.push({ provider, result: reason });
    }
    if (Date.now() + 250 >= state.deadline || sourceBudget.requests >= SOURCE_REQUEST_LIMIT || sourceBudget.bytes >= SOURCE_BYTE_LIMIT) break;
  }
  state.cache.put(key, {missing:true,sourceRevision:SOURCE_REVISION,attempts:state.attempts}, state.attempts.every(a => a.result === "no-match") ? 90000 : 15000);
  return null;
}
function sourceReport(state) {
  return (state.attempts || []).map(a => SOURCES[a.provider] + "：" +
    ({ "no-match": "未找到同版本", cooldown: "限流冷却中", deadline: "超时预算用尽", "source-budget": "查询预算用尽", "service-body-limit": "响应超出大小限制", "request-or-format": "请求或格式失败", matched: "匹配成功" }[a.result] || a.result.replace("http-", "HTTP "))).join("；");
}
function spotifyHeaders(ctx, accept = "application/x-protobuf") {
  const auth = header(ctx.request.headers, "Authorization");
  if (!/^Bearer [^\s]+$/i.test(auth)) return null;
  // Reuse only in-flight credentials, only for this request's Spotify host.
  const headers = { Authorization: auth, Accept: accept, [INTERNAL]: "1" };
  for (const name of ["client-token", "app-platform", "spotify-app-version"]) {
    const value = header(ctx.request.headers, name); if (value) headers[name] = value;
  }
  return headers;
}
function cacheMetadata(state, parsed) {
  const key = "meta:" + parsed.meta.id, old = state.cache.get(key), next = parsed.meta;
  const same = old && old.id === next.id && old.title === next.title && old.album === next.album && old.duration === next.duration &&
    Array.isArray(old.artists) && old.artists.length === next.artists.length && old.artists.every((name,i) => name === next.artists[i]);
  if (!same) state.cache.put(key,next);
  const available = "availability:" + next.id;
  if (parsed.hasLyrics !== null && state.cache.get(available) !== parsed.hasLyrics) state.cache.put(available,parsed.hasLyrics,300000);
}
async function metadata(ctx, host, id, state) {
  const key = "meta:" + id, cached = state.cache.get(key);
  if (goodObject(cached) && cached.id === id) return cached;
  const headers = spotifyHeaders(ctx); if (!headers) return null;
  const hex = base62Hex(id);
  try {
    const response = await http(ctx, "https://" + host + "/metadata/4/track/" + hex, state, { headers });
    const parsed = parseMetadata(response.bytes, hex); cacheMetadata(state, parsed); return parsed.meta;
  } catch (e) {
    // Authentication failures are not a reason to try a different endpoint.
    if (/^http-(?:401|403|429)$/.test(str(e.message)) || ["network-busy","transport-pending","work-superseded"].includes(e.message)) throw e;
  }
  const body = dataField(2, join([stringField(1, "spotify:track:" + id), dataField(2, numberField(1, 10))]));
  const response = await http(ctx, "https://" + host + "/extended-metadata/v0/extended-metadata", state,
    { headers: { ...headers, "Content-Type": "application/x-protobuf" }, body });
  const record = extendedTracks(response.bytes).records.find(r => r.meta.id === id);
  if (!record) throw new Error("extended-track-missing");
  cacheMetadata(state, record); return record.meta;
}
async function translate(ctx, original, state) {
  const language = state.settings.language, translated = new Map(), pending = [];
  let storedCharacters = 0;
  function remember(s,t) {
    if (typeof t !== "string" || !clean(t) || t.length > 6000 || storedCharacters + t.length - (translated.get(s)?.length || 0) > 60000) return false;
    storedCharacters += t.length - (translated.get(s)?.length || 0); translated.set(s,t); return true;
  }
  const unique = new Set(original), id = LYRIC_URL.exec(str(ctx.request?.url))?.[2];
  const key = id ? "translations:v1:" + language + ":" + id : null;
  const saved = key ? state.cache.get(key) : null;
  if (Array.isArray(saved?.pairs) && saved.pairs.length <= MAX_LINES) for (const pair of saved.pairs) {
    if (Array.isArray(pair) && pair.length === 2 && typeof pair[0] === "string" && unique.has(pair[0])) remember(pair[0],pair[1]);
  }
  let cacheChanged = false;
  for (const s of unique) {
    if (!clean(s) || !/[\p{L}\p{N}]/u.test(s) || s.includes("\n") || s.length > 3000) continue;
    if (translated.has(s)) continue;
    const cached = state.cache.get("translation:" + language + ":" + s);
    if (remember(s,cached)) cacheChanged = true; else pending.push(s);
  }
  const base = "https://translate.googleapis.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=" + encodeURIComponent(language);
  const groups = []; let group = [], size = base.length;
  for (const s of pending) {
    const n = encodeURIComponent(s).length + 3;
    if (n + base.length > 6800) continue;
    if (group.length && (size + n > 6800 || group.length >= 32)) { groups.push(group); group = []; size = base.length; }
    group.push(s); size += n;
  }
  if (group.length) groups.push(group);
  for (const rows of groups) {
    if (Date.now() + 250 >= state.deadline) break;
      try {
        const data = await json(ctx, base + rows.map(s => "&q=" + encodeURIComponent(s)).join(""), state, {maxBytes:96 * 1024});
        if (!Array.isArray(data) || data.length !== rows.length) throw new Error("translation-count");
        const values = data.map(x => typeof x === "string" ? x : Array.isArray(x) && typeof x[0] === "string" ? x[0] : null);
        if (values.some(x => x === null || !clean(x) || x.length > 6000)) throw new Error("translation-shape");
        if (storedCharacters + values.reduce((n,v) => n + v.length,0) > 60000) break;
        rows.forEach((s, j) => { const v = clean(values[j]); remember(s,v); if (!key) state.cache.put("translation:" + language + ":" + s, v, 7 * 86400000); });
        cacheChanged = true;
      } catch (error) { if (["network-busy","transport-pending","work-superseded"].includes(error.message)) break; /* Keep row alignment on failure. */ }
  }
  if (key && cacheChanged && translated.size) state.cache.put(key,{pairs:[...translated]},7 * 86400000);
  const usable = new Map([...translated].filter(([s,t]) => t && normal(t) !== normal(s)));
  let changed = 0, outputCharacters = 0;
  const translations = original.map(s => {
    const t = usable.get(s); if (!t) return "";
    outputCharacters += t.length;
    if (outputCharacters > 60000) return "";
    changed++; return t;
  });
  return { translations, changed };
}
function responseHeaders(ctx, format) {
  // Use only Egern's documented Headers get/set/delete API. Preserve all other
  // fields and multiple Set-Cookie headers without enumerating bridge objects.
  const out = ctx.response.headers;
  const originalType = header(out, "Content-Type");
  const requestedType = header(ctx.request?.headers, "Accept").split(",").map(v => v.trim()).find(v => /^application\/[a-z0-9.+-]*protobuf$/i.test(v));
  for (const name of ["Content-Length", "Content-Encoding", "ETag", "Content-MD5", "Digest", "Last-Modified", "Cache-Control", "Content-Type", MARKER]) out.delete(name);
  out.set("Content-Type", format === "json" ? "application/json; charset=utf-8" : /protobuf|octet-stream/i.test(originalType) ? originalType : requestedType || "application/vnd.google.protobuf");
  out.set("Cache-Control", "no-store");
  out.set(MARKER, VERSION);
  return out;
}
async function verseLyricsCore(ctx) {
  if (!ctx.request) return;
  const url = str(ctx.request.url), lyric = LYRIC_URL.exec(url);
  if (!lyric || header(ctx.request.headers, INTERNAL)) return;
  let config;
  try { config = settings(ctx.env); } catch { status(ctx, "设置无效，已保留原响应。"); return; }
  if (!ctx.response) {
    if (lyric ? !config.translate && config.provider === "off" : !config.discover || config.provider === "off") return;
    const headers = ctx.request.headers;
    for (const name of ["If-None-Match", "If-Modified-Since", "Accept-Encoding", "Cache-Control"]) headers.delete(name);
    headers.set("Accept-Encoding", "identity"); headers.set("Cache-Control", "no-cache");
    if (lyric && fallbackFormat(ctx) === "protobuf" && !/protobuf|octet-stream|json/i.test(header(headers, "Accept"))) headers.set("Accept", "application/x-protobuf");
    return { headers };
  }
  const code = ctx.response.status;
  if (header(ctx.response.headers, MARKER)) return;
  if (code !== 200 && !(lyric && code === 404)) { status(ctx, "Spotify HTTP " + code + "，保留原响应，不将鉴权或服务错误当成无词。"); return; }
  if (lyric && code === 200 && !config.translate && config.provider === "off") return;
  let bytes;
  try { bytes = await readBody(ctx.response, LYRIC_URL.test(str(ctx.request.url)) ? BODY_LIMIT : PLAYER_LIMIT); } catch { status(ctx, "无法读取响应或响应超出大小限制，保留原响应。"); return; }
  const unchanged = () => ({ body: bytes });
  if (bytes.length > LIMIT) return unchanged();
  const state = { settings: config, cache: loadCache(ctx, lyric ? {track:lyric[2],language:config.language} : {metadata:true}), deadline: Date.now() + 10000 };
  state.network = networkLease(ctx,state.deadline);
  if (lyric) state.work = lyricWork(ctx,lyric[2]);
  try {
    const contentType = header(ctx.response.headers, "Content-Type");
    let doc, generated = null;
    if (code === 200) {
      doc = parseDocument(bytes, contentType);
      if (doc.blocked) { status(ctx, "Spotify 返回账户权限提示，保留原响应。"); return unchanged(); }
      // Unknown schemas and malformed successful responses are never called 'no lyrics'.
      if (!doc.words.some(s => clean(s))) {
        if (doc.format === "json" && !Object.hasOwn(doc.obj, "lyrics")) return unchanged();
      }
    }
    if (code === 404 || (doc && !doc.words.some(s => clean(s)))) {
      if (config.provider === "off") return unchanged();
      let backupResult = cachedBackup(state,lyric[2]);
      if (backupResult === undefined) {
        let meta; try { meta = await metadata(ctx, lyric[1], lyric[2], state); } catch { }
        if (!meta) { status(ctx, "Spotify 无词，但未取得可核对的歌曲信息，保留原响应。"); return unchanged(); }
        backupResult = await backup(ctx,meta,state);
      }
      const originalColors = existingPalette(bytes, doc);
      const colors = backupResult ? originalColors || await fallbackPalette(ctx,lyric[2],state) : null;
      generated = backupResult ? { ...backupResult, colors } : null;
      if (!generated) { status(ctx, "备用歌词未取得，保留原响应。" + sourceReport(state)); return unchanged(); }
      doc = { format: fallbackFormat(ctx, doc), words: generated.lyrics.lines.map(l => l.words), hasAlternatives: false };
    }
    if (!doc || !doc.words.length) return unchanged();
    const result = config.translate ? await translate(ctx,doc.words,state) : {translations:[],changed:0};
    const replaceTranslations = config.translate && (result.changed > 0 || doc.hasAlternatives);
    if (!generated && !replaceTranslations) {
      status(ctx, config.translate ? "保留 Spotify 原词；插件暂未取得可用译文。" : "插件翻译已关闭，保留原响应。");
      return unchanged();
    }
    if (generated && config.translate) generated = { ...generated, lyrics: { ...generated.lyrics,
      alternatives: result.changed ? [{ language: config.language, lines: result.translations }] : [] } };
    const body = generated ? encodeDocument(generated, doc.format) : doc.writeNative(config.language, result.translations);
    const origin = generated ? "备用来源：" + generated.lyrics.providerDisplayName : "Spotify 原词";
    status(ctx, origin + (config.translate ? result.changed > 0 ? "；已用插件的 " + result.changed + " 句译文（" + config.language + "）替换全部官方译文。" : "；官方译文已移除，插件翻译暂不可用，目前仅保留原词。" : "；插件翻译已关闭。"));
    return { ...(generated ? { status: 200 } : {}), headers: responseHeaders(ctx, doc.format), body };
  } catch { status(ctx, "响应结构不支持或处理失败，已保留原响应。"); return unchanged(); }
  finally { state.cache.save(); state.network?.release(); }
}

// Original VerseLyrics native host bridge, adapter 7 (core 0.4.8).
// CLIENT is fixed at build time, never inferred from another app's globals.
const CLIENT = "Surge";
const nativeQX = CLIENT === "QuantumultX";
let nativeFinished = false, nativeWatchdog, nativeWatchdogStarted = false, nativeDeadline = 0;
function nativeDone(value) {
  if (nativeFinished) return;
  nativeFinished = true;
  if (nativeWatchdog !== undefined && typeof clearTimeout === "function") clearTimeout(nativeWatchdog);
  nativeWatchdog = undefined;
  $done(value || {});
}
class NativeHeaders {
  constructor(value) {
    this.array = Array.isArray(value);
    this.pairs = this.array ? value.map(x => [x.field, x.value]) : Object.entries(value || {});
  }
  get(name) {
    const pair = this.pairs.find(x => x[0].toLowerCase() === name.toLowerCase());
    return pair ? String(pair[1]) : null;
  }
  delete(name) { this.pairs = this.pairs.filter(x => x[0].toLowerCase() !== name.toLowerCase()); }
  set(name, value) { this.delete(name); this.pairs.push([name, String(value)]); }
  native() {
    return this.array ? this.pairs.map(([field, value]) => ({field, value})) : Object.fromEntries(this.pairs);
  }
}
function nativeBytes(value, limit = LIMIT) {
  if (value == null) return new Uint8Array(0);
  if (typeof value === "string") return utf8(value,limit);
  if (Number(value.byteLength) > limit) { const error = new Error("body-limit"); error.bodyBytes = value.byteLength; throw error; }
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (Object.prototype.toString.call(value) === "[object ArrayBuffer]") return new Uint8Array(value);
  throw new Error("unsupported native body");
}
function nativeBuffer(bytes) {
  return bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
    ? bytes.buffer : bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}
function nativeStatus(value) {
  if (typeof value === "number") return value;
  const match = /^(?:HTTP\/\S+\s+)?([1-5]\d\d)(?:\s|$)/.exec(String(value));
  return match ? Number(match[1]) : 0;
}
function nativeResponse(status, headers, data) {
  let bytes;
  function boundedBytes(limit = LIMIT) {
    if (!bytes) bytes = nativeBytes(data,limit);
    if (bytes.byteLength > limit) { const error = new Error("body-limit"); error.bodyBytes = bytes.byteLength; throw error; }
    return bytes;
  }
  return {status: nativeStatus(status), headers: new NativeHeaders(headers), boundedBytes, arrayBuffer: async () => nativeBuffer(boundedBytes())};
}
function nativeArguments() {
  const allowed = ["TRANSLATION_ENABLED", "TARGET_LANGUAGE", "FALLBACK_PROVIDER", "DISCOVER_MISSING"];
  const env = Object.create(null);
  function add(raw) {
    if (typeof raw === "string") {
      for (const item of raw.split("&")) {
        const equal = item.indexOf("=");
        if (equal < 1) continue;
        const key = decodeURIComponent(item.slice(0, equal));
        if (allowed.includes(key)) env[key] = decodeURIComponent(item.slice(equal + 1));
      }
    } else if (raw && typeof raw === "object") {
      for (const key of allowed) if (raw[key] != null) env[key] = String(raw[key]);
    }
  }
  if (nativeQX && typeof $environment !== "undefined") {
    const source = String($environment.sourcePath || "");
    if (source.includes("#")) add(source.slice(source.indexOf("#") + 1));
    add($environment.variables);
  }
  if (typeof $argument !== "undefined") add($argument);
  return env;
}
function nativeHTTP(method, url, options = {}) {
  if (nativeFinished) return Promise.reject(new Error("transport-pending"));
  const ms = Math.max(1, Math.min(2500, Number(options.timeout) || 2500));
  // QX documents a script-exit timer, not a per-fetch cancellation API.
  // One lazy watchdog covers the whole run; cache/entry work creates no timer.
  // Loon/Surge use their native HTTP and script timeouts instead.
  if (nativeQX && !nativeWatchdogStarted) {
    nativeWatchdogStarted = true;
    nativeWatchdog = setTimeout(() => nativeDone({}), Math.max(1, nativeDeadline - Date.now()));
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    function complete(error, response, data) {
      if (settled) return;
      settled = true;
      // Release promise closures after the native transport settles.
      const finish = resolve, fail = reject; resolve = reject = null;
      if (nativeFinished || error) {
        const timedOut = /timeout|timed\s*out|abort/i.test(String(error?.error || error?.message || error || ""));
        fail(new Error(nativeFinished ? "transport-pending" : timedOut ? "native http timeout" : "native http failed")); return;
      }
      try { finish(nativeResponse(response.statusCode ?? response.status, response.headers, data)); }
      catch { fail(new Error("invalid native http response")); }
    }
    try {
      const request = {url, headers: options.headers || {}};
      if (nativeQX) {
        request.method = method.toUpperCase();
        request.opts = {redirection: false, "auto-cookie": false, "skip-cert-verify": false};
        if (options.body !== undefined) {
          if (typeof options.body === "string") request.body = options.body;
          else request.bodyBytes = nativeBuffer(nativeBytes(options.body));
        }
        $task.fetch(request).then(r => {
          if (nativeFinished) complete("finished");
          else complete(null, r, r.bodyBytes ?? r.body);
        }, error => complete(error || true));
      } else {
        request.timeout = CLIENT === "Loon" ? ms : ms / 1000;
        request["binary-mode"] = true;
        request["auto-redirect"] = false;
        request["auto-cookie"] = false;
        request.insecure = false;
        if (options.body !== undefined) request.body = options.body;
        $httpClient[method](request, complete);
      }
    } catch (error) { complete(error || true); }
  });
}
const nativeStorage = {
  getJSON(key) {
    try {
      const raw = nativeQX ? $prefs.valueForKey(key) : $persistentStore.read(key);
      return typeof raw === "string" && raw.length <= 128000 ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  setJSON(key, value) {
    if (nativeFinished) return;
    const raw = JSON.stringify(value);
    if (nativeQX) $prefs.setValueForKey(raw, key); else $persistentStore.write(raw, key);
  }
};
async function nativeMain() {
  if (typeof $request === "undefined" || !$request?.url) return nativeDone({});
  const ctx = {
    request: {url: $request.url, method: $request.method, headers: new NativeHeaders($request.headers)},
    env: nativeArguments(), storage: nativeStorage,
    http: {get: (url, opts) => nativeHTTP("get", url, opts), post: (url, opts) => nativeHTTP("post", url, opts)}
  };
  if (typeof $response !== "undefined" && $response) {
    ctx.response = nativeResponse($response.statusCode ?? $response.status, $response.headers, nativeQX ? $response.bodyBytes ?? $response.body : $response.body);
  }
  nativeDeadline = Date.now() + 12000;
  const result = await verseLyricsCore(ctx);
  if (!result || nativeFinished) return nativeDone({});
  if (nativeQX && ctx.response && result.body === undefined) return nativeDone({});
  // An unchanged byte result must remain passthrough, including an empty 404.
  if (!result.headers && result.status === undefined && result.body && ctx.response) {
    const original = ctx.response.boundedBytes();
    const sameView = result.body.buffer === original.buffer && result.body.byteOffset === original.byteOffset;
    if (result.body.length === original.length && (sameView || result.body.every((b, i) => b === original[i]))) return nativeDone({});
  }
  const output = {};
  if (result.headers) {
    if (nativeQX && ctx.response) {
      // QX owns these fields when replacing body/bodyBytes. Restore their
      // original spelling and values; the shared core may have changed them.
      const protectedNames = ["content-length", "content-type", "content-encoding"];
      for (const name of protectedNames) result.headers.delete(name);
      for (const [field,value] of Object.entries($response.headers || {})) {
        if (protectedNames.includes(field.toLowerCase())) result.headers.pairs.push([field,value]);
      }
    }
    output.headers = result.headers.native();
  }
  if (result.status !== undefined) output.status = nativeQX ? "HTTP/1.1 " + result.status + (result.status === 200 ? " OK" : "") : result.status;
  if (result.body !== undefined && ctx.response) {
    const bytes = nativeBytes(result.body);
    if (nativeQX) output.bodyBytes = nativeBuffer(bytes); else output.body = bytes;
  }
  nativeDone(output);
}
nativeMain().catch(() => nativeDone({}));

})();
