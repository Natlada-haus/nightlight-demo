# เชื่อมข้อมูลการนอนจริง ทำยังไง (สรุปเทคนิค)
ตรวจจากเว็บทางการ / หน้าซัพพอร์ต · 11 พ.ย. 2026 · ในเดโมยังเป็นข้อมูลตัวอย่างทั้งหมด

## สรุปสั้น
- **ทางหลักมีแค่ 2 ทาง:** iOS อ่านจาก **Apple Health (HealthKit)** ส่วน Android อ่านจาก **Health Connect** นาฬิกาส่วนใหญ่ส่งข้อมูลนอนเข้า 2 ที่นี้อยู่แล้ว เราจึงไม่ต้องเชื่อมกับแต่ละยี่ห้อเอง
- **การเชื่อมตรงผ่านคลาวด์ (OAuth) เก็บไว้ทีหลัง** ต้องมีเซิร์ฟเวอร์และต้องขออนุมัติจากบางเจ้า ซึ่งขัดกับ MVP ที่ไม่มีเซิร์ฟเวอร์ ไม่มีบัญชี

## แต่ละเจ้า
| แหล่ง | iOS | Android | API คลาวด์ (ทางเลือก) |
|---|---|---|---|
| iPhone / Apple Watch | HealthKit (sleep analysis) ถ้าใส่ Apple Watch นอน จะได้ระยะการนอน REM/Core/Deep ถ้ามี iPhone อย่างเดียวได้แค่เวลาอยู่บนเตียงจากตารางนอน | – | ไม่มี |
| Samsung Health (Galaxy Watch) | – | Samsung Health ซิงก์การนอนและระยะการนอนเข้า Health Connect (`SleepSessionRecord`) ผู้ใช้ต้องเปิดเองใน Samsung Health > Settings > Health Connect | ไม่มีสำหรับแอปทั่วไป |
| Xiaomi Mi Fitness / Zepp Life / Zepp (Amazfit) | Mi Fitness และ Zepp Life ส่งการนอนเข้า Apple Health ได้ (ส่วนใหญ่ได้แค่เวลานอน ไม่มีระยะการนอน) | Mi Fitness และ Zepp ส่งเข้า Health Connect ได้ | ไม่มีให้แอปทั่วไป |
| Oura | ส่งเข้า Apple Health ได้ ทั้งเวลานอนและระยะการนอน | ส่งเข้า Health Connect ได้ | Oura API v2 (OAuth2, scope `daily`) |
| WHOOP | ส่งเข้า Apple Health ได้ แต่ได้แค่ "เวลาอยู่บนเตียง/เวลาหลับ" ไม่มีระยะการนอน | – | WHOOP API v2 (OAuth2, scope `read:sleep`) |
| Garmin | Garmin Connect ส่ง "Sleep Analysis" เข้า Apple Health ได้ | – | Garmin Health API ใช้ได้เฉพาะธุรกิจที่ได้รับอนุมัติ **ตอนนี้ปิดรับใบสมัครใหม่ชั่วคราว** |
| Fitbit / Pixel Watch | – | ผ่าน Health Connect | Fitbit Web API **ปิดไปแล้วเมื่อ 2 พ.ย. 2026** ต้องใช้ Google Health API แทน (Google OAuth, scope เป็นแบบ Restricted ต้องผ่านการตรวจความปลอดภัย) |
| กรอกเอง | ได้ | ได้ | – ให้แสงน้อยลงนิดหน่อยตามคอนเซปต์ |

## ข้อควรรู้สำหรับพี่โจ้
- Health Connect อ่านข้อมูลได้เฉพาะตอนแอปเปิดอยู่ (foreground) คล้ายกับ HealthKit ที่อ่านตอนล็อกเครื่องไม่ได้ ให้คำนวณแสงตอนเปิดแอปตอนเช้า
- ข้อมูลจากนาฬิกาอาจมาช้า เพราะต้องรอนาฬิกาซิงก์กับแอปของยี่ห้อนั้นก่อน (Samsung แจ้งว่าการส่งข้อมูลอาจล่าช้าได้) ควรมีปุ่ม "ดึงข้อมูลอีกครั้ง"
- ถ้าผู้ใช้มีหลายแหล่ง ข้อมูลอาจซ้ำกัน ให้เลือกรอบนอนหลัก 1 รอบต่อคืน (บน iOS ผู้ใช้ตั้งลำดับแหล่งข้อมูลได้ใน Apple Health)
- ถ้าทำ iOS ก่อน เวอร์ชันแรกทำ HealthKit อย่างเดียวก็ครอบคลุม Apple Watch, Oura, WHOOP, Garmin, Xiaomi ได้ ส่วน Samsung ต้องรอเวอร์ชัน Android (Health Connect)

## แหล่งอ้างอิง
- Apple, Track your sleep on Apple Watch and use Sleep on iPhone: https://support.apple.com/en-us/108906
- Apple, ระยะการนอน/เวลาอยู่บนเตียง (อ้างในคอนเซปต์ v1): https://support.apple.com/en-asia/HT211685
- Samsung Developer, Accessing Samsung Health Data through Health Connect: https://developer.samsung.com/health/blog/en/accessing-samsung-health-data-through-health-connect
- Samsung Developer, Managing Sleep Data with Samsung Health and Health Connect: https://developer.samsung.com/health/blog/en/managing-sleep-data-with-samsung-health-and-health-connect
- Android Developers, Sleep in Health Connect: https://developer.android.com/health-and-fitness/health-connect/experiences/sleep
- Xiaomi support, How to sync Zepp Life to Health App: https://www.mi.com/global/support/article/KA-12890/
- Mi Fitness → Apple Health / Health Connect (คู่มือจากแอปอื่น ไม่ใช่ของ Xiaomi โดยตรง): https://fita.fit/xiaomi-mi-band-apple-health-health-connect
- Oura, Apple Health Integration: https://support.ouraring.com/hc/en-us/articles/360025438734-Apple-Health-Integration
- Oura, Health Connect Integration: https://support.ouraring.com/hc/en-us/articles/10786105824531-Health-Connect-by-Android-Integration
- Oura API authentication (OAuth2): https://cloud.ouraring.com/docs/authentication
- WHOOP for Developers, OAuth 2.0: https://developer.whoop.com/docs/developing/oauth/
- WHOOP Community, Apple Health ไม่มีระยะการนอนจาก WHOOP (กระทู้ผู้ใช้ ล่าสุด ก.ค. 2026): https://www.community.whoop.com/t/apple-health-missing-sleep-stage-data-from-whoop/8192
- Garmin Support, Sharing Your Garmin Connect Data With Apple Health: https://support.garmin.com/en-US/?faq=lK5FPB9iPF5PXFkIpFlFPA
- Garmin Connect Developer Program: https://developer.garmin.com/gc-developer-program
- Terra, Garmin Connect Developer Program is paused: https://tryterra.co/blog/garmin-connect-developer-program-pause
- Google, About the Google Health API (Fitbit Web API ปิด 2 พ.ย. 2026): https://developers.google.com/health/about

**ยังไม่ได้ตรวจ:** ข้อมูลจริงจาก iPhone อย่างเดียวมาช้าแค่ไหนหลังตื่น และนาฬิการุ่นที่คนไทยใช้เยอะ (Xiaomi, Huawei) ส่งข้อมูลครบแค่ไหน ต้องลองกับเครื่องจริง Huawei Health ยังไม่ได้ค้น
