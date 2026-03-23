'use client';
import React from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { FacebookIcon, FrameIcon, InstagramIcon, LinkedinIcon, YoutubeIcon } from 'lucide-react';

interface FooterLink {
	title: string;
	href: string;
	icon?: React.ComponentType<{ className?: string }>;
}

interface FooterSection {
	label: string;
	links: FooterLink[];
}

const footerLinks: FooterSection[] = [
	{
		label: 'Product',
		links: [
			{ title: 'Features', href: '/features' },
			{ title: 'Pricing', href: '/pricing' },
			{ title: 'Solution', href: '/solution' },
			{ title: 'Testimonials', href: '/testimonials' },
			{ title: 'Integration', href: '/integration' },
		],
	},
	{
		label: 'Company',
		links: [
			{ title: 'FAQs', href: '/faqs' },
			{ title: 'About Us', href: '/about' },
			{ title: 'Privacy Policy', href: '/privacy' },
			{ title: 'Terms of Services', href: '/terms' },
		],
	},
	{
		label: 'Resources',
		links: [
			{ title: 'Blog', href: '/blog' },
			{ title: 'Changelog', href: '/changelog' },
			{ title: 'Brand', href: '/brand' },
			{ title: 'Help', href: '/help' },
		],
	},
	{
		label: 'Social Links',
		links: [
			{ title: 'Facebook', href: '#', icon: FacebookIcon },
			{ title: 'Instagram', href: '#', icon: InstagramIcon },
			{ title: 'Youtube', href: '#', icon: YoutubeIcon },
			{ title: 'LinkedIn', href: '#', icon: LinkedinIcon },
		],
	},
];

export function Footer() {
	return (
		<footer className="relative w-full border-t bg-[radial-gradient(35%_128px_at_50%_0%,theme(backgroundColor.white/8%),transparent)] py-6">
			<div className="bg-foreground/20 absolute top-0 right-1/2 left-1/2 h-px w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full blur" />

			<div className="w-full px-6">
				<div className="max-w-7xl mx-auto flex flex-col gap-12 xl:flex-row xl:justify-between xl:items-start">
					<AnimatedContainer className="space-y-2 flex flex-col items-start justify-start xl:flex-shrink-0">
						<div className="flex items-center gap-2">
							<img src="/carebridge-logo.png" alt="CareBridge" className="h-8 w-8 object-contain rounded-md" />
							<span className="font-bold">CareBridge</span>
						</div>
						<p className="text-muted-foreground text-xs">
							© {new Date().getFullYear()} CareBridge. All rights reserved.
						</p>
					</AnimatedContainer>

					<div className="grid grid-cols-2 gap-8 md:grid-cols-4 xl:flex xl:flex-1 xl:justify-evenly">
						{footerLinks.map((section, index) => (
							<AnimatedContainer key={section.label} delay={0.1 + index * 0.1}>
								<div className="flex flex-col gap-2">
									<h3 className="text-xs font-semibold">{section.label}</h3>
									<ul className="text-muted-foreground space-y-3 text-xs">
										{section.links.map((link) => (
											<li key={link.title}>
												<a
													href={link.href}
													className="hover:text-foreground inline-flex items-center gap-2 transition-all duration-300"
												>
													{link.icon && <link.icon className="size-4" />}
													{link.title}
												</a>
											</li>
										))}
									</ul>
								</div>
							</AnimatedContainer>
						))}
					</div>
				</div>
			</div>
		</footer>
	);
};

type ViewAnimationProps = {
	delay?: number;
	className?: ComponentProps<typeof motion.div>['className'];
	children: ReactNode;
};

function AnimatedContainer({ className, delay = 0.1, children }: ViewAnimationProps) {
	const shouldReduceMotion = useReducedMotion();

	if (shouldReduceMotion) {
		return children;
	}

	return (
		<motion.div
			initial={{ filter: 'blur(4px)', translateY: -8, opacity: 0 }}
			whileInView={{ filter: 'blur(0px)', translateY: 0, opacity: 1 }}
			viewport={{ once: true }}
			transition={{ delay, duration: 0.8 }}
			className={className}
		>
			{children}
		</motion.div>
	);
};