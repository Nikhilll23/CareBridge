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
                            <source src="/new-dna.mp4" type="video/mp4" />
                        </video>
                        {/* Optional overlay for better text readability */}
                        <div className="absolute inset-0 bg-black/20" />
                    </div>

                    <div className="py-24 md:pb-32 lg:pb-36 lg:pt-72">
                        <div className="relative z-10 mx-auto flex max-w-7xl flex-col px-6 lg:block lg:px-12">
                            <div className="mx-auto max-w-lg text-center lg:ml-0 lg:max-w-full lg:text-left">
                                <h1 className="mt-8 max-w-2xl text-balance font-outfit text-5xl font-bold tracking-tight md:text-6xl lg:mt-16 xl:text-7xl">
                                    CareBridge
                                </h1>
                                <p className="mt-8 max-w-2xl text-white text-balance font-inter text-lg font-light leading-relaxed tracking-wide text-muted-foreground">
                                    Seamlessly integrate OPD, labs, pharmacy, billing, and EMR into one secure, cohesive platform. Monitor patients, optimize resources, and track revenue in real time—without the friction of disconnected systems.
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
                                    durationOnHover={20}
                                    duration={40}
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
    { name: 'Features', href: '/features' },
    { name: 'Solution', href: '/solution' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'About', href: '/about' },
]

export const HeroHeader = () => {
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
                <div className={cn('mx-auto max-w-7xl rounded-3xl px-6 transition-all duration-300 lg:px-12', scrolled && 'bg-background/80 backdrop-blur-2xl')}>
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
                                                className={cn("font-inter font-medium transition-colors duration-150", scrolled ? "text-foreground hover:text-foreground/70" : "text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] hover:text-white/80")}>
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

export const Logo = ({ className }: { className?: string }) => {
    return (
        <div className={cn("flex items-center gap-2", className)}>
            <img src="/carebridge-logo.png" alt="CareBridge" className="h-10 w-auto object-contain rounded-md" />
        </div>
    )
}