import type { Metadata,Viewport } from "next";
import "./globals.css";
import "./editor.css";
export const metadata:Metadata={title:"구름 제작소",description:"방울이와 함께 물을 모으고, 하늘로 올라가 나만의 구름을 만들어요.",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"}};
export const viewport:Viewport={width:"device-width",initialScale:1,viewportFit:"cover"};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="ko"><body>{children}</body></html>}
