'use client'
import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { InfiniteSlider } from '@/components/ui/infinite-slider'
import { ProgressiveBlur } from '@/components/ui/progressive-blur'
import { cn } from '@/lib/utils'
import { Menu, X, ChevronRight } from 'lucide-react'
import { useScroll, motion } from 'framer-motion'
import { TestimonialsColumn } from "@/components/testimonials-columns-1"
import Experience from "@/components/ui/experience"
import HospitalBentoShowcase from "@/components/hospital-bento-showcase"
import seoImage from "./data/seo.png"
import chatImage from "./data/chates.png"
import timeImage from "./data/time.png"
import meshcraftCircle from "./data/meshcraftCircle.png"
import { AlertTitle } from './ui/alert'
import { Footer } from './footer-section'
export function HeroSection() {

    const abilities = [
        {
            imgPath: seoImage,
            title: "Quality Focus",
            desc: "Delivering high-quality results while maintaining attention to every detail.",
        },
        {
            imgPath: chatImage,
            title: "Reliable Communication",
            desc: "Keeping you updated at every step to ensure transparency and clarity.",
        },
        {
            imgPath: timeImage,
            title: "On-Time Delivery",
            desc: "Making sure projects are completed on schedule, with quality & attention to detail.",
        },
    ];


    return (
        <>
            <HeroHeader />
            <main className="overflow-x-hidden">
                <section className="relative">
                    {/* Video Background */}
                    <div className="absolute inset-0 -z-10">
                        <video
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="h-full w-full object-cover opacity-50 invert dark:opacity-35 dark:invert-0 dark:lg:opacity-75"
                        >
                            <source src="/dna.mp4" type="video/mp4" />
                        </video>
                        {/* Optional overlay for better text readability */}
                        <div className="absolute inset-0 bg-black/20" />
                    </div>

                    <div className="py-24 md:pb-32 lg:pb-36 lg:pt-72">
                        <div className="relative z-10 mx-auto flex max-w-7xl flex-col px-6 lg:block lg:px-12">
                            <div className="mx-auto max-w-lg text-center lg:ml-0 lg:max-w-full lg:text-left">
                                <h1 className="mt-8 max-w-2xl text-balance font-outfit text-5xl font-bold tracking-tight md:text-6xl lg:mt-16 xl:text-7xl">
                                    Hospital Information System
                                </h1>
                                <p className="mt-8 max-w-2xl text-white text-balance font-inter text-lg font-light leading-relaxed tracking-wide text-muted-foreground">
                                    Digitize and connect OPD, IPD, labs, pharmacy, billing, and EMR into one secure platform. Get real-time visibility into patients, resources, and revenue—without operational chaos.
                                </p>

                                <div className="mt-12 flex flex-col items-center justify-center gap-2 sm:flex-row lg:justify-start">
                                    <Button
                                        asChild
                                        size="lg"
                                        className="h-12 rounded-full pl-5 pr-3 text-base font-medium">
                                        <Link href="#link">
                                            <span className="text-nowrap font-inter">Start Building</span>
                                            <ChevronRight className="ml-1" />
                                        </Link>
                                    </Button>
                                    <Button
                                        key={2}
                                        asChild
                                        size="lg"
                                        variant="ghost"
                                        className="h-12 rounded-full px-5 text-base font-medium hover:bg-zinc-950/5 dark:hover:bg-white/5">
                                        <Link href="#link">
                                            <span className="text-nowrap font-inter">Request a demo</span>
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                <section className="bg-background pb-2">
                    <div className="group relative m-auto max-w-7xl px-6">
                        <div className="flex flex-col items-center md:flex-row">
                            <div className="md:max-w-44 md:border-r md:pr-6">
                                <p className="text-end font-inter text-sm font-medium tracking-wide text-muted-foreground">
                                    Powering the best teams
                                </p>
                            </div>
                            <div className="flex justify-center items-center py-3 md:w-[calc(100%-11rem)]">
                                <InfiniteSlider
                                    speedOnHover={20}
                                    speed={40}
                                    gap={112}>


                                    <div className="flex items-center justify-center">
                                        <img
                                            className="mx-auto h-26 w-fit dark:invert"
                                            src="https://imgs.search.brave.com/NM8ojltHU6a5uxWbPCgM9_2ROylagd5KjPtJvnqmUDM/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93d3cu/bG9nb3NoYXBlLmNv/bS93cC1jb250ZW50/L3VwbG9hZHMvMjAy/NS8wNy9OYXJheWFu/YS1IZWFsdGgtbG9n/b19sb2dvc2hhcGUu/cG5n"
                                            alt="narayan"
                                            height="16"
                                            width="auto"
                                        />
                                    </div>
                                    <div className="flex items-center justify-center">
                                        <img
                                            className="mx-auto h-32 w-fit dark:invert"
                                            src="https://imgs.search.brave.com/s2uDR1cywTk5NgvFDPr-cjRfqs0XOavprOLufHZAdyo/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9zZWVr/dmVjdG9ycy5jb20v/c3RvcmFnZS9pbWFn/ZXMvRm9ydGlzJTIw/TG9nby5zdmc"
                                            alt="fortis"
                                            height="16"
                                            width="auto"
                                        />
                                    </div>
                                    <div className="flex items-center justify-center">
                                        <img
                                            className="mx-auto h-24 w-fit dark:invert"
                                            src="https://imgs.search.brave.com/lj1mnb4PjY785OA8vX0bpXp9n68Mji3L89vUxKqv9nU/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly93d3cu/bG9nb3NoYXBlLmNv/bS93cC1jb250ZW50/L3VwbG9hZHMvMjAy/NS8wNy9Bc3Rlci1E/TS1IZWFsdGhjYXJl/LUxvZ29fbG9nb3No/YXBlLnBuZw"
                                            alt="aster"
                                            height="20"
                                            width="auto"
                                        />
                                    </div>
                                    <div className="flex items-center justify-center">
                                        <img
                                            className="mx-auto h-14 w-fit dark:invert"
                                            src="https://imgs.search.brave.com/NdcQINRbU30CpJB5zoad6DaBWsNM5UfJNQ_CdURzjLc/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9jZG4u/YnJhbmRmZXRjaC5p/by9pZFBzQXFZSkRx/L3cvMTg1L2gvMTAw/L3RoZW1lL2Rhcmsv/bG9nby5wbmc_Yz0x/YnhpZDY0TXVwN2Fj/emV3U0FZTVgmdD0x/NzY1NTQ0MDM5MjUy"
                                            alt="medicover"
                                            height="20"
                                            width="auto"
                                        />
                                    </div>
                                    <div className="flex items-center justify-center">
                                        <img
                                            className="mx-auto h-28 w-fit dark:invert"
                                            src="https://imgs.search.brave.com/9pluDDxLIQlHEGRcPNvi5xVCxcJrWdHD10NThcSAhis/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pbWFn/ZXMuc2Vla2xvZ28u/Y29tL2xvZ28tcG5n/LzMwLzMvbWVkYW50/YS10aGUtbWVkaWNp/dHktbG9nby1wbmdf/c2Vla2xvZ28tMzA0/ODk0LnBuZw"
                                            alt="medanta"
                                            height="16"
                                            width="auto"
                                        />
                                    </div>

                                </InfiniteSlider>

                                <div className="bg-linear-to-r from-background absolute inset-y-0 left-0 w-20"></div>
                                <div className="bg-linear-to-l from-background absolute inset-y-0 right-0 w-20"></div>
                                <ProgressiveBlur
                                    className="pointer-events-none absolute left-0 top-0 h-full w-20"
                                    direction="left"
                                    blurIntensity={1}
                                />
                                <ProgressiveBlur
                                    className="pointer-events-none absolute right-0 top-0 h-full w-20"
                                    direction="right"
                                    blurIntensity={1}
                                />
                            </div>
                        </div>
                    </div>
                    <div>


                        {/*                       
   <div className='flex flex-col  text-8xl items-center abhaya-extrabold'>
  <div className='relative tracking-wider left-36'>
    <div className='text-white relative right-56'>Crafting Worlds.</div>
    <div className='flex items-center justify-center'>
      <img src={meshcraftCircle} className='h-24 relative top-1.5' alt="" />
      <div className='text-white'>One Polygon.</div>
    </div>
    <div className='text-white'>At A Time.</div>
  </div>
</div>

<div className='mt-12'> 
  <h1 className='text-white text-xl mx-auto max-w-4xl playfair-extrabold tracking-wider text-center px-8'>
    "At Meshcraft, we're dedicated to helping indie game developers like you turn your ideas into reality. We understand the challenges of building a game from the ground up, which is why we're here to support you every step of the way. From detailed 3D models and lifelike characters to breathtaking level designs and seamless animations, we provide everything you need to bring your vision to life. But we're more than just a service — we're your partner on this creative journey."
  </h1>
  <div className='flex justify-center items-center mt-8'>
    <button className='text-white border border-white rounded-xl px-8 py-2 text-lg hover:bg-white hover:text-black transition-colors'>
      what we do
    </button>
  </div>
</div> */}



                    </div>

                </section>
                <HospitalBentoShowcase />
                <Testimonials />
            </main>
            <Footer />
        </>
    )
}

const testimonials = [
    {
        text: "The HIS unified OPD, IPD, diagnostics, pharmacy, and billing into a single workflow. Real-time visibility across departments has significantly reduced delays and manual errors.",
        image: "https://randomuser.me/api/portraits/men/45.jpg",
        name: "Dr. Michael Reynolds",
        role: "Medical Director",
    },
    {
        text: "Bed occupancy, OT utilization, and revenue dashboards are now available in real time. This has helped hospital leadership make faster, data-driven decisions.",
        image: "https://randomuser.me/api/portraits/women/52.jpg",
        name: "Emily Carter",
        role: "Hospital Administrator",
    },
    {
        text: "Integrated billing and insurance workflows helped us reduce revenue leakage and improve claim turnaround time. Audit trails and approvals are a big plus.",
        image: "https://randomuser.me/api/portraits/men/61.jpg",
        name: "David Thompson",
        role: "Director of Finance & Revenue Cycle",
    },
    {
        text: "Clinicians now have a unified EMR with complete patient history across OPD, IPD, lab, and radiology. This has improved clinical coordination and patient safety.",
        image: "https://randomuser.me/api/portraits/women/34.jpg",
        name: "Dr. Sarah Mitchell",
        role: "Senior Consultant Physician",
    },
    {
        text: "Nursing workflows, medication orders, and discharge processes are now fully digitized. This has reduced paperwork and improved turnaround times on the floor.",
        image: "https://randomuser.me/api/portraits/women/68.jpg",
        name: "Laura Bennett",
        role: "Chief Nursing Officer",
    },
    {
        text: "The system aligns well with accreditation and documentation requirements and provides detailed audit logs. Compliance and data security were key factors for us.",
        image: "https://randomuser.me/api/portraits/men/72.jpg",
        name: "Mark Anderson",
        role: "Director of Quality & Compliance",
    },
    {
        text: "Pharmacy inventory, consumable tracking, and charge capture are tightly integrated with clinical workflows, ensuring accurate billing and stock control.",
        image: "https://randomuser.me/api/portraits/men/18.jpg",
        name: "James Walker",
        role: "Pharmacy Operations Manager",
    },
    {
        text: "The HIS scaled smoothly across multiple departments and locations. Configuration flexibility allowed us to match our existing hospital processes.",
        image: "https://randomuser.me/api/portraits/women/41.jpg",
        name: "Rachel Morgan",
        role: "Chief Information Officer (CIO)",
    },
];

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);
const thirdColumn = testimonials.slice(6, 9);

const Testimonials = () => {
    return (
        <section className="bg-background py-12">
            <div className="container z-10 mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                    viewport={{ once: true }}
                    className="flex flex-col items-center justify-center max-w-135 mx-auto"
                >
                    <div className="flex justify-center">
                        <div className="border py-1  px-4 rounded-lg">Testimonials</div>
                    </div>

                    <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tighter mt-5">
                        What our users say
                    </h2>
                    <p className="text-center mt-5 opacity-75">
                        See what our customers have to say about us.
                    </p>
                </motion.div>

                <div className="flex justify-center gap-6 mt-10 mask-[linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] max-h-185 overflow-hidden">
                    <TestimonialsColumn testimonials={firstColumn} duration={15} />
                    <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={19} />
                    <TestimonialsColumn testimonials={thirdColumn} className="hidden lg:block" duration={17} />
                </div>
            </div>
        </section>
    );
};

const menuItems = [
    { name: 'Features', href: '#link' },
    { name: 'Solution', href: '#link' },
    { name: 'Pricing', href: '#link' },
    { name: 'About', href: '#link' },
]

const HeroHeader = () => {
    const [menuState, setMenuState] = React.useState(false)
    const [scrolled, setScrolled] = React.useState(false)
    const { scrollYProgress } = useScroll()

    React.useEffect(() => {
        const unsubscribe = scrollYProgress.on('change', (latest) => {
            setScrolled(latest > 0.05)
        })
        return () => unsubscribe()
    }, [scrollYProgress])

    return (
        <header>
            <nav
                data-state={menuState && 'active'}
                className="group fixed z-20 w-full pt-2">
                <div className={cn('mx-auto max-w-7xl rounded-3xl px-6 transition-all duration-300 lg:px-12', scrolled && 'bg-background/50 backdrop-blur-2xl')}>
                    <motion.div
                        key={1}
                        className={cn('relative flex flex-wrap items-center justify-between gap-6 py-3 duration-200 lg:gap-0 lg:py-6', scrolled && 'lg:py-4')}>
                        <div className="flex w-full items-center justify-between gap-12 lg:w-auto">
                            <Link
                                href="/"
                                aria-label="home"
                                className="flex items-center space-x-2">
                                <Logo />
                            </Link>

                            <button
                                onClick={() => setMenuState(!menuState)}
                                aria-label={menuState == true ? 'Close Menu' : 'Open Menu'}
                                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden">
                                <Menu className="group-data-[state=active]:rotate-180 group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                                <X className="group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
                            </button>

                            <div className="hidden lg:block">
                                <ul className="flex gap-8 text-sm">
                                    {menuItems.map((item, index) => (
                                        <li key={index}>
                                            <Link
                                                href={item.href}
                                                className="font-inter font-medium text-muted-foreground transition-colors duration-150 hover:text-accent-foreground">
                                                <span>{item.name}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="bg-background group-data-[state=active]:block lg:group-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent">
                            <div className="lg:hidden">
                                <ul className="space-y-6 text-base">
                                    {menuItems.map((item, index) => (
                                        <li key={index}>
                                            <Link
                                                href={item.href}
                                                className="font-inter font-medium text-muted-foreground transition-colors duration-150 hover:text-accent-foreground">
                                                <span>{item.name}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                                <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className="font-inter font-medium">
                                    <Link href="/sign-in">
                                        <span>Login</span>
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    size="sm"
                                    className="font-inter font-medium">
                                    <Link href="/sign-up">
                                        <span>Sign Up</span>
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </nav>
        </header>
    )
}

const Logo = ({ className }: { className?: string }) => {
    return (
        <svg
            viewBox="0 0 78 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn('h-5 w-auto', className)}>
            <path
                d="M3 0H5V18H3V0ZM13 0H15V18H13V0ZM18 3V5H0V3H18ZM0 15V13H18V15H0Z"
                fill="url(#logo-gradient)"
            />
            <path
                d="M27.06 7.054V12.239C27.06 12.5903 27.1393 12.8453 27.298 13.004C27.468 13.1513 27.7513 13.225 28.148 13.225H29.338V14.84H27.808C26.9353 14.84 26.2667 14.636 25.802 14.228C25.3373 13.82 25.105 13.157 25.105 12.239V7.054H24V5.473H25.105V3.144H27.06V5.473H29.338V7.054H27.06ZM30.4782 10.114C30.4782 9.17333 30.6709 8.34033 31.0562 7.615C31.4529 6.88967 31.9855 6.32867 32.6542 5.932C33.3342 5.524 34.0822 5.32 34.8982 5.32C35.6349 5.32 36.2752 5.46733 36.8192 5.762C37.3745 6.04533 37.8165 6.40233 38.1452 6.833V5.473H40.1002V14.84H38.1452V13.446C37.8165 13.888 37.3689 14.2563 36.8022 14.551C36.2355 14.8457 35.5895 14.993 34.8642 14.993C34.0595 14.993 33.3229 14.789 32.6542 14.381C31.9855 13.9617 31.4529 13.3837 31.0562 12.647C30.6709 11.899 30.4782 11.0547 30.4782 10.114ZM38.1452 10.148C38.1452 9.502 38.0092 8.941 37.7372 8.465C37.4765 7.989 37.1309 7.62633 36.7002 7.377C36.2695 7.12767 35.8049 7.003 35.3062 7.003C34.8075 7.003 34.3429 7.12767 33.9122 7.377C33.4815 7.615 33.1302 7.972 32.8582 8.448C32.5975 8.91267 32.4672 9.468 32.4672 10.114C32.4672 10.76 32.5975 11.3267 32.8582 11.814C33.1302 12.3013 33.4815 12.6753 33.9122 12.936C34.3542 13.1853 34.8189 13.31 35.3062 13.31C35.8049 13.31 36.2695 13.1853 36.7002 12.936C37.1309 12.6867 37.4765 12.324 37.7372 11.848C38.0092 11.3607 38.1452 10.794 38.1452 10.148ZM43.6317 4.232C43.2803 4.232 42.9857 4.113 42.7477 3.875C42.5097 3.637 42.3907 3.34233 42.3907 2.991C42.3907 2.63967 42.5097 2.345 42.7477 2.107C42.9857 1.869 43.2803 1.75 43.6317 1.75C43.9717 1.75 44.2607 1.869 44.4987 2.107C44.7367 2.345 44.8557 2.63967 44.8557 2.991C44.8557 3.34233 44.7367 3.637 44.4987 3.875C44.2607 4.113 43.9717 4.232 43.6317 4.232ZM44.5837 5.473V14.84H42.6457V5.473H44.5837ZM49.0661 2.26V14.84H47.1281V2.26H49.0661ZM50.9645 10.114C50.9645 9.17333 51.1572 8.34033 51.5425 7.615C51.9392 6.88967 52.4719 6.32867 53.1405 5.932C53.8205 5.524 54.5685 5.32 55.3845 5.32C56.1212 5.32 56.7615 5.46733 57.3055 5.762C57.8609 6.04533 58.3029 6.40233 58.6315 6.833V5.473H60.5865V14.84H58.6315V13.446C58.3029 13.888 57.8552 14.2563 57.2885 14.551C56.7219 14.8457 56.0759 14.993 55.3505 14.993C54.5459 14.993 53.8092 14.789 53.1405 14.381C52.4719 13.9617 51.9392 13.3837 51.5425 12.647C51.1572 11.899 50.9645 11.0547 50.9645 10.114ZM58.6315 10.148C58.6315 9.502 58.4955 8.941 58.2235 8.465C57.9629 7.989 57.6172 7.62633 57.1865 7.377C56.7559 7.12767 56.2912 7.003 55.7925 7.003C55.2939 7.003 54.8292 7.12767 54.3985 7.377C53.9679 7.615 53.6165 7.972 53.3445 8.448C53.0839 8.91267 52.9535 9.468 52.9535 10.114C52.9535 10.76 53.0839 11.3267 53.3445 11.814C53.6165 12.3013 53.9679 12.6753 54.3985 12.936C54.8405 13.1853 55.3052 13.31 55.7925 13.31C56.2912 13.31 56.7559 13.1853 57.1865 12.936C57.6172 12.6867 57.9629 12.324 58.2235 11.848C58.4955 11.3607 58.6315 10.794 58.6315 10.148ZM65.07 6.833C65.3533 6.357 65.7273 5.98867 66.192 5.728C66.668 5.456 67.229 5.32 67.875 5.32V7.326H67.382C66.6227 7.326 66.0447 7.51867 65.648 7.904C65.2627 8.28933 65.07 8.958 65.07 9.91V14.84H63.132V5.473H65.07V6.833ZM73.3624 10.165L77.6804 14.84H75.0624L71.5944 10.811V14.84H69.6564V2.26H71.5944V9.57L74.9944 5.473H77.6804L73.3624 10.165Z"
                fill="currentColor"
            />
            <defs>
                <linearGradient
                    id="logo-gradient"
                    x1="10"
                    y1="0"
                    x2="10"
                    y2="20"
                    gradientUnits="userSpaceOnUse">
                    <stop stopColor="#9B99FE" />
                    <stop
                        offset="1"
                        stopColor="#2BC8B7"
                    />
                </linearGradient>
            </defs>
        </svg>
    )
}