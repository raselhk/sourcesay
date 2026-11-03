/**
 * SourceSay admin app: Reports, Survey builder, Settings.
 * Vanilla JS, no build step. Uses wp.apiFetch (REST nonce), wp.i18n and wp.hooks (extension points, listed in the For developers panel).
 */
( function () {
	'use strict';

	const wp = window.wp || {};
	const cfg = window.sourcesayAdmin || {};
	const mount = document.getElementById( 'sourcesay-app' );
	if ( ! mount || ! wp.apiFetch || ! wp.i18n ) {
		return;
	}
	const { __, _n, sprintf } = wp.i18n;

	const NS = '/' + String( cfg.restNamespace || 'sourcesay/v1' ).replace( /^\/+|\/+$/g, '' );
	const SPRITE = cfg.icons || '';
	const SURVEY_CSS = SPRITE ? SPRITE.replace( /icons\.svg(\?.*)?$/, 'css/survey.css' ) + ( cfg.version ? '?ver=' + encodeURIComponent( cfg.version ) : '' ) : '';
	const MAX_OPTIONS = 20;
	const LOCALE = document.documentElement.lang || undefined;
	const SVGNS = 'http://www.w3.org/2000/svg';

	/* Fallback icon library (mirrors sourcesay_icon_groups()); the server list wins when it loads. */
	const ICON_GROUPS = {
		social: { label: __( 'Social media', 'sourcesay' ), icons: [ 'instagram', 'facebook', 'tiktok', 'x', 'threads', 'bluesky', 'snapchat', 'pinterest', 'linkedin', 'reddit', 'tumblr', 'mastodon' ] },
		search: { label: __( 'Search and AI', 'sourcesay' ), icons: [ 'google', 'ai', 'robot', 'globe' ] },
		media: { label: __( 'Video and audio', 'sourcesay' ), icons: [ 'youtube', 'twitch', 'vimeo', 'spotify', 'apple-podcasts', 'soundcloud', 'microphone', 'television', 'radio' ] },
		messaging: { label: __( 'Messaging and community', 'sourcesay' ), icons: [ 'whatsapp', 'messenger', 'telegram', 'discord', 'wechat', 'slack', 'chat', 'users', 'community', 'referral' ] },
		shopping: { label: __( 'Marketplaces, apps and reviews', 'sourcesay' ), icons: [ 'amazon', 'etsy', 'marketplace', 'app-store', 'google-play', 'yelp', 'tripadvisor' ] },
		content: { label: __( 'Email and content', 'sourcesay' ), icons: [ 'envelope', 'article', 'newspaper', 'medium', 'substack', 'github', 'dribbble', 'behance' ] },
		offline: { label: __( 'Offline and local', 'sourcesay' ), icons: [ 'storefront', 'map-pin', 'car', 'print', 'qr-code', 'event', 'calendar', 'gift', 'phone', 'award' ] },
		general: { label: __( 'General', 'sourcesay' ), icons: [ 'star', 'megaphone', 'tag', 'question' ] },
	};
	const ICON_KEYS = Object.keys( ICON_GROUPS ).reduce( ( all, g ) => all.concat( ICON_GROUPS[ g ].icons ), [] );
	const ICON_LABELS = {
		instagram: 'Instagram',
		facebook: 'Facebook',
		tiktok: 'TikTok',
		x: __( 'X (Twitter)', 'sourcesay' ),
		threads: 'Threads',
		bluesky: 'Bluesky',
		snapchat: 'Snapchat',
		pinterest: 'Pinterest',
		linkedin: 'LinkedIn',
		reddit: 'Reddit',
		tumblr: 'Tumblr',
		mastodon: 'Mastodon',
		google: 'Google',
		ai: __( 'AI assistant', 'sourcesay' ),
		robot: __( 'Chatbot', 'sourcesay' ),
		globe: __( 'Website', 'sourcesay' ),
		youtube: 'YouTube',
		twitch: 'Twitch',
		vimeo: 'Vimeo',
		spotify: 'Spotify',
		'apple-podcasts': 'Apple Podcasts',
		soundcloud: 'SoundCloud',
		microphone: __( 'Podcast microphone', 'sourcesay' ),
		television: __( 'TV', 'sourcesay' ),
		radio: __( 'Radio', 'sourcesay' ),
		whatsapp: 'WhatsApp',
		messenger: 'Messenger',
		telegram: 'Telegram',
		discord: 'Discord',
		wechat: 'WeChat',
		slack: 'Slack',
		chat: __( 'Chat', 'sourcesay' ),
		users: __( 'Friends and family', 'sourcesay' ),
		community: __( 'Community or group', 'sourcesay' ),
		referral: __( 'Referral', 'sourcesay' ),
		amazon: 'Amazon',
		etsy: 'Etsy',
		marketplace: __( 'Marketplace', 'sourcesay' ),
		'app-store': 'App Store',
		'google-play': 'Google Play',
		yelp: 'Yelp',
		tripadvisor: 'Tripadvisor',
		envelope: __( 'Email', 'sourcesay' ),
		article: __( 'Blog or article', 'sourcesay' ),
		newspaper: __( 'Newspaper or magazine', 'sourcesay' ),
		medium: 'Medium',
		substack: 'Substack',
		github: 'GitHub',
		dribbble: 'Dribbble',
		behance: 'Behance',
		storefront: __( 'Shop or storefront', 'sourcesay' ),
		'map-pin': __( 'Map or location', 'sourcesay' ),
		car: __( 'Drove by', 'sourcesay' ),
		print: __( 'Print or flyer', 'sourcesay' ),
		'qr-code': __( 'QR code', 'sourcesay' ),
		event: __( 'Event or ticket', 'sourcesay' ),
		calendar: __( 'Calendar', 'sourcesay' ),
		gift: __( 'Gift', 'sourcesay' ),
		phone: __( 'Phone call', 'sourcesay' ),
		award: __( 'Award', 'sourcesay' ),
		star: __( 'Star or influencer', 'sourcesay' ),
		megaphone: __( 'Ad or promotion', 'sourcesay' ),
		tag: __( 'Tag', 'sourcesay' ),
		question: __( 'Question mark', 'sourcesay' ),
	};
	/* Extra search words (not shown). English brand and channel words people type. */
	const ICON_WORDS = {
		x: 'twitter tweet',
		instagram: 'insta ig reels',
		facebook: 'fb meta',
		tiktok: 'video short',
		snapchat: 'snap',
		youtube: 'video channel',
		twitch: 'video stream live gaming',
		vimeo: 'video',
		ai: 'chatgpt openai perplexity gemini claude copilot sparkle',
		robot: 'bot ai assistant',
		globe: 'web internet online browser',
		google: 'search maps seo',
		microphone: 'podcast audio',
		'apple-podcasts': 'podcast itunes',
		spotify: 'podcast music',
		soundcloud: 'music audio',
		television: 'tv commercial ad',
		radio: 'fm audio ad',
		messenger: 'facebook chat',
		chat: 'message conversation',
		users: 'friend family word mouth people',
		community: 'group forum club people',
		referral: 'handshake partner colleague recommend word mouth',
		marketplace: 'shopping bag store',
		envelope: 'email newsletter mail',
		article: 'blog post review',
		newspaper: 'press magazine news print',
		storefront: 'store shop walk local',
		'map-pin': 'maps location local directions',
		car: 'drive road billboard',
		print: 'printer flyer poster brochure leaflet',
		'qr-code': 'scan code',
		event: 'ticket trade show conference fair',
		gift: 'present voucher coupon',
		phone: 'call telephone sales',
		award: 'trophy prize winner',
		star: 'influencer creator celebrity favourite',
		megaphone: 'advert advertising promo campaign',
		tag: 'label sale discount',
		question: 'other unknown',
	};
	const PRESET_LABELS = {
		general: __( 'General store', 'sourcesay' ),
		fashion: __( 'Fashion and beauty', 'sourcesay' ),
		b2b: __( 'B2B and services', 'sourcesay' ),
		local: __( 'Local business', 'sourcesay' ),
	};
	// Extensions add tabs through the sourcesay.tabs filter when the app boots (see boot()).
	let TABS = [
		{ id: 'reports', label: __( 'Reports', 'sourcesay' ), icon: 'chart' },
		{ id: 'survey', label: __( 'Survey', 'sourcesay' ), icon: 'list' },
		{ id: 'settings', label: __( 'Settings', 'sourcesay' ), icon: 'gear' },
	];
	const DRAFT_TABS = [ 'survey', 'settings' ]; // Tabs that edit the shared settings draft.

	/* ------------------------------------------------------------------ */
	/* State                                                              */
	/* ------------------------------------------------------------------ */
	const S = {
		tab: null,
		saved: null,
		draft: null,
		presets: {},
		icons: ICON_KEYS,
		iconGroups: ICON_GROUPS,
		settingsState: 'loading',
		settingsErr: null,
		report: null,
		reportState: 'loading',
		reportErr: null,
		reportReq: 0,
		range: { preset: 30, from: '', to: '' },
		customOpen: false,
		today: '',
		chartMetric: 'responses',
		previewMobile: false,
		showErrors: false,
		touched: new Set(),
		saving: false,
		presetPick: '',
		allowNav: false,
		keySeq: 0,
		accentCustom: false,
		status: null,
		statusState: 'loading',
		statusErr: null,
		setupOpen: false,
		setup: { step: 1, preset: 'general', test: 'idle', url: '', base: null, timer: 0, started: 0, live: false },
		jump: '',
	};
	const R = {}; // Live DOM references for the current tab.

	/* ------------------------------------------------------------------ */
	/* DOM helpers                                                        */
	/* ------------------------------------------------------------------ */
	function add( node, kids ) {
		kids.forEach( ( c ) => {
			if ( c === null || c === undefined || c === false ) {
				return;
			}
			if ( Array.isArray( c ) ) {
				add( node, c );
			} else {
				node.appendChild( typeof c === 'object' ? c : document.createTextNode( String( c ) ) );
			}
		} );
		return node;
	}

	function el( tag, props, ...kids ) {
		const n = document.createElement( tag );
		Object.keys( props || {} ).forEach( ( k ) => {
			const v = props[ k ];
			if ( v === null || v === undefined || v === false ) {
				return;
			}
			if ( k === 'class' ) {
				n.className = v;
			} else if ( k === 'text' ) {
				n.textContent = v;
			} else if ( k === 'on' ) {
				Object.keys( v ).forEach( ( e ) => n.addEventListener( e, v[ e ] ) );
			} else if ( k === 'value' ) {
				n.value = v;
			} else if ( k === 'checked' || k === 'disabled' || k === 'hidden' || k === 'selected' ) {
				n[ k ] = true;
			} else {
				n.setAttribute( k, v === true ? '' : v );
			}
		} );
		return add( n, kids );
	}

	function ico( key, cls ) {
		const s = document.createElementNS( SVGNS, 'svg' );
		s.setAttribute( 'class', cls || 'ss-ico' );
		s.setAttribute( 'aria-hidden', 'true' );
		s.setAttribute( 'focusable', 'false' );
		const u = document.createElementNS( SVGNS, 'use' );
		u.setAttribute( 'href', SPRITE + '#ss-i-' + key );
		s.appendChild( u );
		return s;
	}

	function svgEl( tag, attrs, text ) {
		const n = document.createElementNS( SVGNS, tag );
		Object.keys( attrs || {} ).forEach( ( k ) => n.setAttribute( k, attrs[ k ] ) );
		if ( text !== undefined ) {
			n.textContent = text;
		}
		return n;
	}

	/** Fill a translated template ("%1$s brings %2$s") with nodes or strings. */
	function fill( template, parts ) {
		const out = [];
		template.split( /(%\d\$s)/ ).forEach( ( piece ) => {
			const m = piece.match( /^%(\d)\$s$/ );
			out.push( m ? parts[ +m[ 1 ] - 1 ] : piece );
		} );
		return out;
	}

	function clone( o ) {
		return JSON.parse( JSON.stringify( o ) );
	}

	function stable( o ) {
		if ( Array.isArray( o ) ) {
			return '[' + o.map( stable ).join( ',' ) + ']';
		}
		if ( o && typeof o === 'object' ) {
			return '{' + Object.keys( o ).filter( ( k ) => k[ 0 ] !== '_' ).sort().map( ( k ) => JSON.stringify( k ) + ':' + stable( o[ k ] ) ).join( ',' ) + '}';
		}
		return JSON.stringify( o );
	}

	function uid( p ) {
		S.keySeq += 1;
		return ( p || 'ss' ) + '-' + S.keySeq;
	}

	function siteHome() {
		return cfg.shopUrl || cfg.homeUrl || location.href.split( '/wp-admin/' )[ 0 ] + '/';
	}

	/* ------------------------------------------------------------------ */
	/* Formatting                                                         */
	/* ------------------------------------------------------------------ */
	function decode( s ) {
		const t = document.createElement( 'textarea' );
		t.innerHTML = String( s || '' );
		return t.value;
	}

	function currency() {
		const c = ( S.report && S.report.currency ) || {};
		return {
			symbol: decode( c.symbol || '$' ),
			decimals: Number.isFinite( +c.decimals ) ? +c.decimals : 2,
			position: c.position || 'left',
			thousand: c.thousand === undefined ? ',' : c.thousand,
			decimal: c.decimal || '.',
		};
	}

	function numberFormat( n, dec, th, de ) {
		const fixed = Math.abs( +n || 0 ).toFixed( dec );
		const parts = fixed.split( '.' );
		parts[ 0 ] = parts[ 0 ].replace( /\B(?=(\d{3})+(?!\d))/g, th );
		return ( n < 0 ? '-' : '' ) + parts.join( de );
	}

	function fmtNum( n ) {
		return numberFormat( n, 0, currency().thousand, '.' );
	}

	function withSymbol( num, c ) {
		switch ( c.position ) {
			case 'right':
				return num + c.symbol;
			case 'left_space':
				return c.symbol + ' ' + num;
			case 'right_space':
				return num + ' ' + c.symbol;
			default:
				return c.symbol + num;
		}
	}

	function fmtMoney( v ) {
		const c = currency();
		return withSymbol( numberFormat( v, c.decimals, c.thousand, c.decimal ), c );
	}

	function fmtMoneyShort( v ) {
		const c = currency();
		if ( Math.abs( v ) >= 1000 ) {
			return withSymbol( numberFormat( v / 1000, v >= 10000 || v % 1000 === 0 ? 0 : 1, c.thousand, c.decimal ) + 'k', c );
		}
		return withSymbol( numberFormat( v, 0, c.thousand, c.decimal ), c );
	}

	function fmtPct( f, digits ) {
		const v = +f || 0;
		if ( v > 0 && v < 0.005 && ! digits ) {
			return '<1%';
		}
		return new Intl.NumberFormat( LOCALE, { style: 'percent', maximumFractionDigits: digits || 0 } ).format( v );
	}

	function parseDay( s ) {
		const m = /^(\d{4})-(\d{2})-(\d{2})/.exec( s || '' );
		return m ? new Date( Date.UTC( +m[ 1 ], +m[ 2 ] - 1, +m[ 3 ] ) ) : null;
	}

	function isoDay( d ) {
		return d.toISOString().slice( 0, 10 );
	}

	function addDays( s, n ) {
		const d = parseDay( s );
		d.setUTCDate( d.getUTCDate() + n );
		return isoDay( d );
	}

	function localToday() {
		const d = new Date();
		return isoDay( new Date( Date.UTC( d.getFullYear(), d.getMonth(), d.getDate() ) ) );
	}

	function fmtDay( s, withYear ) {
		const d = parseDay( s );
		if ( ! d ) {
			return s || '';
		}
		const o = { month: 'short', day: 'numeric', timeZone: 'UTC' };
		if ( withYear ) {
			o.year = 'numeric';
		}
		return new Intl.DateTimeFormat( LOCALE, o ).format( d );
	}

	function errText( err ) {
		if ( err && err.code === 'fetch_error' ) {
			return __( 'Your site could not be reached. Check your connection and try again.', 'sourcesay' );
		}
		return ( err && err.message ) || __( 'Something went wrong while loading this data.', 'sourcesay' );
	}

	/* ------------------------------------------------------------------ */
	/* REST + mock fallback (mock only when sourcesayAdmin.mock === true)  */
	/* ------------------------------------------------------------------ */
	function api( path, opts ) {
		return wp.apiFetch( Object.assign( { path: NS + path }, opts || {} ) ).catch( ( err ) => {
			const missing = err && ( err.code === 'rest_no_route' || ( err.data && err.data.status === 404 ) );
			if ( cfg.mock === true && missing ) {
				return mockApi( path, opts || {} );
			}
			throw err;
		} );
	}

	function opt( id, label, icon, fu, q, ph ) {
		return { id, label, icon, enabled: true, followup: { enabled: !! fu, question: q || '', placeholder: ph || '' } };
	}

	function mockDefaults() {
		const general = [
			opt( 'google', 'Google search', 'google' ),
			opt( 'instagram', 'Instagram', 'instagram' ),
			opt( 'facebook', 'Facebook', 'facebook' ),
			opt( 'tiktok', 'TikTok', 'tiktok' ),
			opt( 'youtube', 'YouTube', 'youtube' ),
			opt( 'friend', 'Friend or family', 'users', false, 'Who should we thank?' ),
			opt( 'podcast', 'Podcast', 'microphone', true, 'Which podcast?' ),
			opt( 'influencer', 'Influencer or creator', 'star', true, 'Who was it?' ),
			opt( 'email', 'Email or newsletter', 'envelope' ),
			opt( 'blog', 'Blog or article', 'article' ),
			opt( 'ad', 'Online ad', 'megaphone' ),
		];
		const pick = ( ids ) => ids.map( ( i ) => clone( general.find( ( o ) => o.id === i ) ) );
		const fashion = pick( [ 'influencer', 'instagram', 'tiktok' ] ).concat( [ opt( 'pinterest', 'Pinterest', 'pinterest' ) ], pick( [ 'google', 'youtube', 'facebook', 'friend', 'podcast', 'email', 'blog', 'ad' ] ) );
		const b2b = [ clone( general[ 0 ] ), opt( 'linkedin', 'LinkedIn', 'linkedin' ), opt( 'referral', 'Colleague or referral', 'users' ), opt( 'event', 'Trade show or event', 'calendar' ) ].concat( pick( [ 'podcast', 'email', 'blog' ] ) );
		const local = [ opt( 'google', 'Google search or Maps', 'google' ) ].concat( pick( [ 'friend', 'facebook', 'instagram' ] ), [ opt( 'walk', 'Walked or drove by', 'storefront' ), opt( 'flyer', 'Flyer or print', 'newspaper' ), opt( 'radio', 'Radio or TV', 'radio' ) ] );
		return {
			settings: {
				enabled: false,
				question: 'How did you hear about us?',
				options: clone( general ),
				other: { enabled: true, label: 'Other', placeholder: 'Tell us where' },
				shuffle: true,
				position: 'after',
				layout: 'buttons',
				accent: '',
				thank_you: 'Thanks, that really helps!',
				show_in_account: true,
				retention_days: 0,
				delete_on_uninstall: false,
				placement: 'auto',
				audience: 'all',
				allow_skip: true,
				skip_label: 'Prefer not to say',
			},
			presets: { general, fashion, b2b, local },
		};
	}

	let mockStore = null;
	function mockApi( path, opts ) {
		if ( ! mockStore ) {
			mockStore = mockDefaults();
		}
		return new Promise( ( resolve ) => {
			setTimeout( () => {
				const method = opts.method || 'GET';
				if ( path.indexOf( '/admin/status' ) === 0 ) {
					const s = mockStore.settings;
					const problems = [];
					if ( ! s.enabled ) {
						problems.push( { code: 'disabled', message: 'The survey is off and not live yet. Only test orders show it.' } );
					} else if ( ! s.options.some( ( o ) => o.enabled ) ) {
						problems.push( { code: 'no_options', message: 'No answers are switched on.' } );
					}
					resolve( {
						test_responses: mockStore.testAnswers || 0,
						survey_live: ! problems.length,
						problems,
						checkout_type: 'block',
						theme: 'Twenty Twenty-Five',
						caching_plugin: null,
						responses_total: mockStore.responses || 0,
						last_response_at: mockStore.lastAt || null,
						paid_orders_30d: 0,
						response_rate_30d: 0,
						setup_done: !! mockStore.setupDone,
						test_orders: mockStore.tests || 0,
					} );
					return;
				}
				if ( path.indexOf( '/admin/setup-done' ) === 0 ) {
					mockStore.setupDone = true;
					resolve( { ok: true } );
					return;
				}
				if ( path.indexOf( '/admin/test-orders' ) === 0 && method === 'DELETE' ) {
					const n = mockStore.tests || 0;
					mockStore.tests = 0;
					resolve( { deleted: n } );
					return;
				}
				if ( path.indexOf( '/admin/test-order' ) === 0 ) {
					mockStore.tests = ( mockStore.tests || 0 ) + 1;
					// Pretend the test answer arrives a few seconds later.
					setTimeout( () => {
						mockStore.testAnswers = ( mockStore.testAnswers || 0 ) + 1;
					}, 6000 );
					resolve( { order_id: 9000 + mockStore.tests, url: siteHome() + '?sourcesay-mock-order=' + mockStore.tests } );
					return;
				}
				if ( path.indexOf( '/admin/settings' ) === 0 ) {
					if ( method === 'POST' ) {
						mockStore.settings = clone( opts.data.settings );
					}
					resolve( { settings: clone( mockStore.settings ), presets: clone( mockStore.presets ), icons: ICON_KEYS.slice(), icon_groups: clone( ICON_GROUPS ) } );
					return;
				}
				const q = new URLSearchParams( path.split( '?' )[ 1 ] || '' );
				resolve( mockReport( q.get( 'from' ), q.get( 'to' ) ) );
			}, 450 );
		} );
	}

	function mockReport( from, to ) {
		to = to || localToday();
		from = from || addDays( to, -29 );
		let seed = 7;
		const rnd = () => {
			seed = ( seed * 16807 ) % 2147483647;
			return ( seed - 1 ) / 2147483646;
		};
		const chans = [
			[ 'google', 'Google search', 'google', 30, 64 ],
			[ 'instagram', 'Instagram', 'instagram', 22, 47 ],
			[ 'friend', 'Friend or family', 'users', 13, 72 ],
			[ 'tiktok', 'TikTok', 'tiktok', 11, 34 ],
			[ 'facebook', 'Facebook', 'facebook', 7, 55 ],
			[ 'podcast', 'Podcast', 'microphone', 6, 121 ],
			[ 'youtube', 'YouTube', 'youtube', 5, 68 ],
			[ 'email', 'Email or newsletter', 'envelope', 3, 84 ],
			[ 'other', 'Other', 'question', 3, 58 ],
		];
		const wsum = chans.reduce( ( a, c ) => a + c[ 3 ], 0 );
		const agg = {};
		chans.forEach( ( c ) => {
			agg[ c[ 0 ] ] = { answer_id: c[ 0 ], label: c[ 1 ], icon: c[ 2 ], responses: 0, orders: 0, revenue: 0 };
		} );
		const trend = [];
		const nvr = { new: { responses: 0, revenue: 0 }, returning: { responses: 0, revenue: 0 } };
		let total = 0;
		let revenue = 0;
		for ( let d = from; d <= to; d = addDays( d, 1 ) ) {
			const n = Math.round( 2 + rnd() * 6 );
			let dayRev = 0;
			for ( let i = 0; i < n; i++ ) {
				let r = rnd() * wsum;
				const c = chans.find( ( ch ) => ( r -= ch[ 3 ] ) <= 0 ) || chans[ 0 ];
				const v = Math.round( c[ 4 ] * ( 0.6 + rnd() * 0.8 ) * 100 ) / 100;
				const a = agg[ c[ 0 ] ];
				a.responses++;
				a.orders++;
				a.revenue += v;
				dayRev += v;
				const bucket = rnd() < 0.27 ? nvr.returning : nvr.new;
				bucket.responses++;
				bucket.revenue += v;
			}
			total += n;
			revenue += dayRev;
			trend.push( { date: d, responses: n, revenue: Math.round( dayRev * 100 ) / 100 } );
		}
		const channels = Object.values( agg ).filter( ( a ) => a.responses ).map( ( a ) => Object.assign( a, {
			revenue: Math.round( a.revenue * 100 ) / 100,
			aov: a.revenue / a.responses,
			share_responses: a.responses / total,
			share_revenue: revenue ? a.revenue / revenue : 0,
		} ) ).sort( ( a, b ) => b.revenue - a.revenue );
		const paid = Math.round( total / 0.41 );
		return {
			range: { from, to },
			currency: { code: 'USD', symbol: '&#36;', decimals: 2, position: 'left', thousand: ',', decimal: '.' },
			totals: { paid_orders: paid, responses: total, response_rate: total / paid, revenue, aov: total ? revenue / total : 0 },
			channels,
			trend,
			followups: {
				podcast: [ { text: 'Huberman Lab', count: 6 }, { text: 'My First Million', count: 3 }, { text: 'The Tim Ferriss Show', count: 2 }, { text: 'Hidden Brain', count: 1 } ],
				friend: [ { text: 'My sister', count: 4 }, { text: 'A coworker', count: 2 } ],
			},
			other: [
				{ text: 'Saw your stand at the Saturday farmers market', date: addDays( to, -1 ) },
				{ text: 'Reddit thread about gift ideas', date: addDays( to, -3 ) },
				{ text: 'Spotify ad', date: addDays( to, -6 ) },
			],
			new_vs_returning: nvr,
		};
	}

	/* ------------------------------------------------------------------ */
	/* Toasts (top right) + live region                                   */
	/* ------------------------------------------------------------------ */
	const toastBox = el( 'div', { class: 'ss-toasts', role: 'status', 'aria-live': 'polite' } );
	const live = el( 'div', { class: 'ss-sr', 'aria-live': 'polite' } );

	function toast( type, text, action ) {
		const t = el( 'div', { class: 'ss-toast ss-toast--' + type },
			ico( type === 'success' ? 'check' : ( type === 'error' ? 'warning' : 'info' ) ),
			el( 'div', { class: 'ss-toast__text', text } ),
			action ? el( 'button', { type: 'button', class: 'ss-btn ss-btn--tertiary ss-btn--sm', text: action.label, on: { click: () => {
				action.run();
				close();
			} } } ) : null,
			el( 'button', { type: 'button', class: 'ss-icon-btn', 'aria-label': __( 'Dismiss notification', 'sourcesay' ), on: { click: () => close() } }, ico( 'close' ) )
		);
		function close() {
			clearTimeout( timer );
			t.remove();
		}
		const timer = setTimeout( close, type === 'error' ? 8000 : ( action ? 7000 : 4000 ) );
		toastBox.appendChild( t );
	}

	function announce( text ) {
		live.textContent = '';
		setTimeout( () => {
			live.textContent = text;
		}, 50 );
	}

	/* ------------------------------------------------------------------ */
	/* Settings draft                                                     */
	/* ------------------------------------------------------------------ */
	function withKeys( settings ) {
		const s = clone( settings );
		s.options = ( s.options || [] ).map( ( o ) => Object.assign( { followup: { enabled: false, question: '', placeholder: '' } }, o, { _k: uid( 'o' ) } ) );
		s.other = Object.assign( { enabled: true, label: '', placeholder: '' }, s.other || {} );
		return s;
	}

	function isDirty() {
		return !! ( S.saved && S.draft ) && stable( S.draft ) !== stable( S.saved );
	}

	function slug( s ) {
		return String( s || '' ).toLowerCase().normalize( 'NFKD' ).replace( /[̀-ͯ]/g, '' ).replace( /[^a-z0-9]+/g, '-' ).replace( /^-+|-+$/g, '' ).slice( 0, 40 ) || 'option';
	}

	function payload() {
		const d = clone( S.draft );
		const used = new Set( [ 'other' ] );
		d.options.forEach( ( o ) => {
			if ( ! o._new && o.id ) {
				used.add( o.id );
			}
		} );
		d.options.forEach( ( o ) => {
			if ( o._new || ! o.id ) {
				const base = slug( o.label );
				let id = base;
				let n = 2;
				while ( used.has( id ) ) {
					id = base + '-' + n++;
				}
				o.id = id;
				used.add( id );
			}
			delete o._k;
			delete o._new;
		} );
		d.retention_days = parseInt( d.retention_days, 10 ) || 0;
		return d;
	}

	function validate() {
		const d = S.draft;
		const e = {};
		if ( ! d ) {
			return e;
		}
		if ( ! String( d.question || '' ).trim() ) {
			e.question = __( 'Write the question customers will see.', 'sourcesay' );
		}
		d.options.forEach( ( o ) => {
			if ( ! String( o.label || '' ).trim() ) {
				e[ 'label:' + o._k ] = __( 'Add a label or delete this answer.', 'sourcesay' );
			}
			if ( o.followup && o.followup.enabled && ! String( o.followup.question || '' ).trim() ) {
				e[ 'fu:' + o._k ] = __( 'Write the follow-up question, or turn the follow-up off.', 'sourcesay' );
			}
		} );
		if ( d.enabled && ! d.options.some( ( o ) => o.enabled ) ) {
			e.options = __( 'Show at least one answer, or customers will not see the survey.', 'sourcesay' );
		}
		if ( d.other.enabled && ! String( d.other.label || '' ).trim() ) {
			e.other = __( 'Add a label for the Other answer.', 'sourcesay' );
		}
		if ( d.accent && ! /^#[0-9a-f]{6}$/i.test( d.accent ) ) {
			e.accent = __( 'Use a hex colour like #4f5bff.', 'sourcesay' );
		}
		if ( ! String( d.thank_you || '' ).trim() ) {
			e.thank_you = __( 'Write a short thank-you message.', 'sourcesay' );
		}
		if ( d.allow_skip && ! String( d.skip_label || '' ).trim() ) {
			e.skip_label = __( 'Write the text for the skip button, or turn the button off.', 'sourcesay' );
		}
		return e;
	}

	/** Show/hide inline errors. A field shows its error once touched or after a save attempt. */
	function updateErrors() {
		const errs = validate();
		mount.querySelectorAll( '[data-err]' ).forEach( ( box ) => {
			const key = box.getAttribute( 'data-err' );
			const show = !! errs[ key ] && ( S.showErrors || S.touched.has( key ) );
			box.hidden = ! show;
			box.lastChild.textContent = show ? errs[ key ] : '';
			const input = box.id ? mount.querySelector( '[aria-describedby~="' + box.id + '"]' ) : null;
			if ( input ) {
				if ( show ) {
					input.setAttribute( 'aria-invalid', 'true' );
				} else {
					input.removeAttribute( 'aria-invalid' );
				}
			}
		} );
		return errs;
	}

	function errBox( key ) {
		return el( 'p', { class: 'ss-field__error', 'data-err': key, id: uid( 'err' ), hidden: true }, ico( 'warning' ), el( 'span' ) );
	}

	/** Called on every draft edit. */
	function changed( opts ) {
		updateErrors();
		updateSavebar();
		if ( ! opts || opts.preview !== false ) {
			renderPreview();
		}
	}

	/* ------------------------------------------------------------------ */
	/* Form building blocks                                               */
	/* ------------------------------------------------------------------ */
	function textField( o ) {
		const id = uid( 'f' );
		const err = o.errKey ? errBox( o.errKey ) : null;
		const helpId = o.help ? uid( 'h' ) : null;
		const count = o.max ? el( 'span', { class: 'ss-count', 'aria-hidden': 'true' } ) : null;
		const input = el( 'input', {
			class: 'ss-input' + ( o.inputClass ? ' ' + o.inputClass : '' ),
			type: 'text',
			id,
			value: o.value || '',
			maxlength: o.max || null,
			placeholder: o.placeholder || null,
			'aria-describedby': [ helpId, err && err.id ].filter( Boolean ).join( ' ' ) || null,
			on: {
				input: () => {
					setCount();
					o.onInput( input.value );
				},
				blur: () => {
					if ( o.errKey ) {
						S.touched.add( o.errKey );
						updateErrors();
					}
				},
			},
		} );
		function setCount() {
			if ( count ) {
				count.textContent = input.value.length + '/' + o.max;
				count.classList.toggle( 'is-near', input.value.length >= o.max * 0.9 );
			}
		}
		setCount();
		const label = el( 'label', { class: o.hideLabel ? 'ss-sr' : 'ss-field__label', for: id, text: o.label } );
		return el( 'div', { class: 'ss-field' + ( o.class ? ' ' + o.class : '' ) },
			o.hideLabel ? label : el( 'div', { class: 'ss-field__row' }, label, count ),
			input,
			o.help ? el( 'p', { class: 'ss-field__help', id: helpId, text: o.help } ) : null,
			err
		);
	}

	function toggle( o ) {
		const id = uid( 't' );
		const helpId = o.help ? uid( 'h' ) : null;
		const input = el( 'input', {
			type: 'checkbox',
			class: 'ss-switch',
			role: 'switch',
			id,
			checked: !! o.checked,
			'aria-describedby': helpId,
			'aria-label': o.ariaLabel || null,
			on: { change: () => o.onChange( input.checked, input ) },
		} );
		if ( o.compact ) {
			return el( 'label', { class: 'ss-toggle ss-toggle--compact', for: id }, input, el( 'span', { text: o.label } ) );
		}
		return el( 'label', { class: 'ss-toggle', for: id }, input,
			el( 'span', { class: 'ss-toggle__text' },
				el( 'span', { class: 'ss-toggle__label', text: o.label } ),
				o.help ? el( 'span', { class: 'ss-field__help', id: helpId, text: o.help } ) : null
			)
		);
	}

	function selectField( o ) {
		const id = uid( 's' );
		const helpId = o.help ? uid( 'h' ) : null;
		const sel = el( 'select', { class: 'ss-select', id, 'aria-describedby': helpId, on: { change: () => o.onChange( sel.value ) } },
			o.options.map( ( p ) => el( 'option', { value: String( p[ 0 ] ), text: p[ 1 ], selected: String( p[ 0 ] ) === String( o.value ) } ) )
		);
		return el( 'div', { class: 'ss-field' },
			el( 'label', { class: 'ss-field__label', for: id, text: o.label } ),
			sel,
			o.help ? el( 'p', { class: 'ss-field__help', id: helpId, text: o.help } ) : null
		);
	}

	function card( o, ...body ) {
		const titleId = uid( 'c' );
		return el( 'section', { class: 'ss-card' + ( o.class ? ' ' + o.class : '' ), 'aria-labelledby': titleId },
			el( 'div', { class: 'ss-card__head' },
				o.icon ? el( 'span', { class: 'ss-chip-ico' + ( o.tone ? ' ss-chip-ico--' + o.tone : '' ) }, ico( o.icon ) ) : null,
				el( 'div', { class: 'ss-card__headtext' },
					el( 'h2', { class: 'ss-card__title', id: titleId, text: o.title } ),
					o.desc ? el( 'p', { class: 'ss-card__desc', text: o.desc } ) : null
				),
				o.actions ? el( 'div', { class: 'ss-card__actions' }, o.actions ) : null
			),
			el( 'div', { class: 'ss-card__body' }, body )
		);
	}

	function seg( label, items, value, onPick, small ) {
		return el( 'div', { class: 'ss-seg' + ( small ? ' ss-seg--sm' : '' ), role: 'group', 'aria-label': label },
			items.map( ( it ) => el( 'button', {
				type: 'button',
				class: 'ss-seg__btn',
				'aria-pressed': String( it[ 0 ] === value ),
				text: it[ 1 ],
				on: { click: () => onPick( it[ 0 ] ) },
			} ) )
		);
	}

	/** Info tip: a small "i" button that shows a plain-words explanation on hover, focus or tap. */
	function tip( label, text ) {
		const id = uid( 'tip' );
		const b = el( 'button', {
			type: 'button',
			class: 'ss-tip',
			'aria-label': sprintf( /* translators: %s: metric name */ __( 'What is %s?', 'sourcesay' ), label ),
			'aria-describedby': id,
			'aria-expanded': 'false',
			on: {
				click: ( e ) => {
					e.preventDefault();
					e.stopPropagation();
					const open = b.getAttribute( 'aria-expanded' ) !== 'true';
					mount.querySelectorAll( '.ss-tip[aria-expanded="true"]' ).forEach( ( x ) => x.setAttribute( 'aria-expanded', 'false' ) );
					b.setAttribute( 'aria-expanded', String( open ) );
				},
				keydown: ( e ) => {
					if ( e.key === 'Escape' ) {
						b.setAttribute( 'aria-expanded', 'false' );
					}
				},
				blur: () => b.setAttribute( 'aria-expanded', 'false' ),
			},
		}, ico( 'info' ), el( 'span', { class: 'ss-tip__text', role: 'tooltip', id, text } ) );
		return b;
	}

	function labelWithTip( label, text ) {
		return el( 'span', { class: 'ss-label-tip' }, label, tip( label, text ) );
	}

	function details( summary, body, open, icon, tone ) {
		return el( 'details', { class: 'ss-details', open: !! open },
			el( 'summary', { class: 'ss-details__summary' },
				icon ? el( 'span', { class: 'ss-chip-ico' + ( tone ? ' ss-chip-ico--' + tone : '' ) }, ico( icon ) ) : null,
				el( 'span', { class: 'ss-details__label', text: summary } ),
				ico( 'caret-down', 'ss-ico ss-details__caret' )
			),
			el( 'div', { class: 'ss-details__body' }, body )
		);
	}

	function copyText( text ) {
		const done = () => toast( 'success', __( 'Copied to the clipboard', 'sourcesay' ) );
		if ( navigator.clipboard && window.isSecureContext ) {
			navigator.clipboard.writeText( text ).then( done, () => fallbackCopy( text, done ) );
		} else {
			fallbackCopy( text, done );
		}
	}

	function fallbackCopy( text, done ) {
		const t = el( 'textarea', { style: 'position:fixed;opacity:0;top:0;left:0', readonly: true } );
		t.value = text;
		document.body.appendChild( t );
		t.select();
		let ok = false;
		try {
			ok = document.execCommand( 'copy' );
		} catch ( e ) {
			ok = false;
		}
		t.remove();
		if ( ok ) {
			done();
		} else {
			toast( 'error', __( 'Copy did not work in this browser. Select the text and copy it by hand.', 'sourcesay' ) );
		}
	}

	function codeBlock( code, label ) {
		return el( 'div', { class: 'ss-code' },
			el( 'div', { class: 'ss-code__bar' },
				el( 'span', { class: 'ss-code__label', text: label || '' } ),
				el( 'button', { type: 'button', class: 'ss-btn ss-btn--tertiary ss-btn--sm', 'aria-label': sprintf( /* translators: %s: code example name */ __( 'Copy %s', 'sourcesay' ), label || __( 'code', 'sourcesay' ) ), on: { click: () => copyText( code ) } }, __( 'Copy', 'sourcesay' ) )
			),
			el( 'pre', { tabindex: '0' }, el( 'code', { text: code } ) )
		);
	}

	function pageHead( title, desc, actions ) {
		return el( 'div', { class: 'ss-page-head' },
			el( 'div', null,
				el( 'h1', { class: 'ss-page-head__title', tabindex: '-1', text: title } ),
				desc ? el( 'p', { class: 'ss-page-head__desc' }, desc ) : null
			),
			actions ? el( 'div', { class: 'ss-page-head__actions' }, actions ) : null
		);
	}

	function errorCard( err, retry ) {
		return el( 'div', { class: 'ss-card' },
			el( 'div', { class: 'ss-error', role: 'alert' },
				el( 'span', { class: 'ss-error__icon' }, ico( 'warning' ) ),
				el( 'h2', { class: 'ss-error__title', text: __( 'This data could not be loaded', 'sourcesay' ) } ),
				el( 'p', { class: 'ss-error__text', text: errText( err ) } ),
				err && err.code ? el( 'p', { class: 'ss-field__help', text: sprintf( /* translators: %s: error code */ __( 'Error code: %s', 'sourcesay' ), err.code ) } ) : null,
				el( 'div', { class: 'ss-empty__actions' },
					el( 'button', { type: 'button', class: 'ss-btn ss-btn--primary', on: { click: retry } }, ico( 'refresh' ), __( 'Try again', 'sourcesay' ) )
				)
			)
		);
	}

	/* ------------------------------------------------------------------ */
	/* Shell + routing                                                    */
	/* ------------------------------------------------------------------ */
	let nav = null;
	const main = el( 'div', { class: 'ss-content', id: 'ss-main' } );

	/** Build the header and tab bar. Runs once, after every extension script has registered its hooks. */
	function buildShell() {
		const tabs = applyHook( 'sourcesay.tabs', TABS, { ui: UI } ).filter( ( t ) => t && t.id && t.label );
		TABS = tabs.length ? tabs : TABS;
		nav = el( 'nav', { class: 'ss-tabs', 'aria-label': __( 'SourceSay sections', 'sourcesay' ) },
			TABS.map( ( t ) => el( 'a', {
				class: 'ss-tab',
				href: '#' + t.id,
				'data-tab': t.id,
				on: { click: ( e ) => {
					if ( needsLeaveWarning( t.id ) ) {
						e.preventDefault();
						askLeave( t.id );
					}
				} },
			}, ico( t.icon || 'gear' ), t.label ) )
		);
		const header = el( 'header', { class: 'ss-header' },
			el( 'div', { class: 'ss-brand' },
				el( 'span', { class: 'ss-brand__mark' }, cfg.logo ? el( 'img', { src: cfg.logo, alt: '', width: 26, height: 26 } ) : ico( 'responses' ) ),
				el( 'span', { class: 'ss-brand__text' },
					el( 'span', { class: 'ss-brand__name', text: 'SourceSay' } ),
					el( 'span', { class: 'ss-brand__by', text: __( 'by SwiftWebDev', 'sourcesay' ) } )
				)
			),
			nav
		);
		mount.textContent = '';
		add( mount, [ header, main, toastBox, live ] );
	}

	if ( SURVEY_CSS && ! document.getElementById( 'sourcesay-survey-css' ) ) {
		document.head.appendChild( el( 'link', { rel: 'stylesheet', id: 'sourcesay-survey-css', href: SURVEY_CSS } ) );
	}

	function tabFromHash() {
		const h = location.hash.replace( '#', '' );
		return TABS.some( ( t ) => t.id === h ) ? h : 'reports';
	}

	function needsLeaveWarning( next ) {
		return DRAFT_TABS.includes( S.tab ) && ! DRAFT_TABS.includes( next ) && isDirty() && ! S.allowNav;
	}

	function askLeave( next ) {
		const dlg = el( 'dialog', { class: 'ss-dialog', 'aria-labelledby': 'ss-dlg-title', 'aria-describedby': 'ss-dlg-text' } );
		const go = () => {
			S.allowNav = true;
			dlg.close();
			location.hash = next;
		};
		add( dlg, [
			el( 'div', { class: 'ss-dialog__body' },
				el( 'h2', { class: 'ss-dialog__title', id: 'ss-dlg-title', text: __( 'Save your changes?', 'sourcesay' ) } ),
				el( 'p', { class: 'ss-dialog__text', id: 'ss-dlg-text', text: __( 'You changed the survey or settings and have not saved yet. Customers keep seeing the last saved version.', 'sourcesay' ) } )
			),
			el( 'div', { class: 'ss-dialog__foot' },
				el( 'button', { type: 'button', class: 'ss-btn ss-btn--tertiary', text: __( 'Keep editing', 'sourcesay' ), on: { click: () => dlg.close() } } ),
				el( 'button', { type: 'button', class: 'ss-btn ss-btn--neutral', text: __( 'Discard changes', 'sourcesay' ), on: { click: () => {
					S.draft = withKeys( S.saved );
					go();
				} } } ),
				el( 'button', { type: 'button', class: 'ss-btn ss-btn--primary', autofocus: true, text: __( 'Save and continue', 'sourcesay' ), on: { click: () => {
					dlg.close();
					save().then( ( ok ) => {
						if ( ok ) {
							S.allowNav = true;
							location.hash = next;
						}
					} );
				} } } )
			),
		] );
		dlg.addEventListener( 'close', () => dlg.remove() );
		mount.appendChild( dlg );
		dlg.showModal();
	}

	window.addEventListener( 'hashchange', () => {
		const next = tabFromHash();
		if ( next === S.tab ) {
			return;
		}
		if ( needsLeaveWarning( next ) ) {
			history.replaceState( null, '', '#' + S.tab );
			askLeave( next );
			return;
		}
		S.allowNav = false;
		S.tab = next;
		render( true );
	} );

	window.addEventListener( 'beforeunload', ( e ) => {
		if ( isDirty() ) {
			e.preventDefault();
			e.returnValue = '';
		}
	} );

	function render( focus ) {
		closePopover();
		nav.querySelectorAll( '.ss-tab' ).forEach( ( a ) => {
			if ( a.getAttribute( 'data-tab' ) === S.tab ) {
				a.setAttribute( 'aria-current', 'page' );
			} else {
				a.removeAttribute( 'aria-current' );
			}
		} );
		Object.keys( R ).forEach( ( k ) => delete R[ k ] );
		main.textContent = '';
		const wrap = el( 'div', { class: 'ss-wrap' + ( focus ? ' is-enter' : '' ) } );
		main.appendChild( wrap );
		if ( S.tab === 'reports' ) {
			renderReports( wrap );
		} else if ( S.tab === 'survey' ) {
			renderSurvey( wrap );
		} else if ( S.tab === 'settings' ) {
			renderSettings( wrap );
		} else {
			const ext = TABS.find( ( t ) => t.id === S.tab );
			if ( ext && typeof ext.render === 'function' ) {
				ext.render( wrap, { ui: UI } );
			}
		}
		if ( focus ) {
			const h1 = main.querySelector( 'h1' );
			if ( h1 ) {
				h1.focus( { preventScroll: true } );
			}
			window.scrollTo( 0, 0 );
		}
		jumpToTarget();
	}

	/** "Show me how" links: scroll to a card on the next render that has it (settings may still be loading). */
	function jumpToTarget() {
		if ( ! S.jump ) {
			return;
		}
		const target = main.querySelector( '[data-jump="' + S.jump + '"]' );
		if ( ! target ) {
			return;
		}
		S.jump = '';
		const help = target.querySelector( 'details' );
		if ( help ) {
			help.open = true;
		}
		target.scrollIntoView( { block: 'start', behavior: window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ? 'auto' : 'smooth' } );
		const h = target.querySelector( '.ss-card__title' );
		if ( h ) {
			h.setAttribute( 'tabindex', '-1' );
			h.focus( { preventScroll: true } );
		}
		target.classList.remove( 'is-flash' );
		void target.offsetWidth;
		target.classList.add( 'is-flash' );
	}

	function showMeHow( e ) {
		S.jump = 'placement';
		if ( S.tab === 'survey' ) {
			e.preventDefault();
			jumpToTarget();
		}
	}

	/* ------------------------------------------------------------------ */
	/* Reports                                                            */
	/* ------------------------------------------------------------------ */
	function rangeFor( preset ) {
		const to = S.today || localToday();
		return { from: addDays( to, -( preset - 1 ) ), to };
	}

	function loadReport() {
		const req = ++S.reportReq;
		S.reportState = 'loading';
		if ( R.reportBody ) {
			R.reportBody.setAttribute( 'aria-busy', 'true' );
			R.reportBody.style.opacity = S.report ? '0.6' : '';
		}
		let q = '';
		if ( S.range.from && S.range.to ) {
			q = '?from=' + encodeURIComponent( S.range.from ) + '&to=' + encodeURIComponent( S.range.to );
		}
		api( '/admin/report' + q ).then( ( rep ) => {
			if ( req !== S.reportReq ) {
				return;
			}
			S.report = rep;
			S.reportState = 'ready';
			if ( rep && rep.range ) {
				if ( ! S.today ) {
					S.today = rep.range.to;
				}
				S.range.from = rep.range.from;
				S.range.to = rep.range.to;
			}
			if ( S.tab === 'reports' && ! S.setupOpen ) {
				render();
			}
		} ).catch( ( err ) => {
			if ( req !== S.reportReq ) {
				return;
			}
			S.reportState = 'error';
			S.reportErr = err;
			if ( S.tab === 'reports' ) {
				render();
			}
		} );
	}

	function exportHref() {
		if ( ! cfg.exportUrl ) {
			return '';
		}
		try {
			const u = new URL( cfg.exportUrl, location.href );
			if ( S.range.from ) {
				u.searchParams.set( 'from', S.range.from );
				u.searchParams.set( 'to', S.range.to );
			}
			return u.toString();
		} catch ( e ) {
			return cfg.exportUrl;
		}
	}

	function renderReports( wrap ) {
		if ( S.setupOpen ) {
			renderSetup( wrap );
			return;
		}
		const presets = [ [ 7, __( '7 days', 'sourcesay' ) ], [ 30, __( '30 days', 'sourcesay' ) ], [ 90, __( '90 days', 'sourcesay' ) ], [ 'custom', __( 'Custom', 'sourcesay' ) ] ];
		const range = el( 'div', { class: 'ss-range' },
			seg( __( 'Date range', 'sourcesay' ), presets, S.customOpen ? 'custom' : S.range.preset, ( p ) => {
				if ( p === 'custom' ) {
					S.customOpen = ! S.customOpen;
					render();
					const f = main.querySelector( '.ss-range__custom input' );
					if ( f ) {
						f.focus();
					}
					return;
				}
				S.customOpen = false;
				S.range = Object.assign( { preset: p }, rangeFor( p ) );
				render();
				loadReport();
			} ),
			cfg.exportUrl ? el( 'a', { class: 'ss-btn ss-btn--secondary', href: exportHref() }, ico( 'download' ), __( 'Export CSV', 'sourcesay' ) ) : null
		);
		let rangeText = S.range.from ? sprintf( /* translators: 1: start date, 2: end date */ __( 'Showing %1$s to %2$s.', 'sourcesay' ), fmtDay( S.range.from ), fmtDay( S.range.to, true ) ) : '';
		const prevRange = S.report && S.report.previous && S.report.previous.range;
		if ( rangeText && prevRange && prevRange.from ) {
			rangeText += ' ' + sprintf( /* translators: 1: start date, 2: end date of the previous period */ __( 'Changes compare with %1$s to %2$s.', 'sourcesay' ), fmtDay( prevRange.from ), fmtDay( prevRange.to, true ) );
		}
		wrap.appendChild( pageHead( __( 'Reports', 'sourcesay' ), [ __( 'See which channels customers name after checkout and how much revenue each one brings.', 'sourcesay' ), rangeText ? ' ' + rangeText : '' ], range ) );

		if ( S.customOpen ) {
			wrap.appendChild( customRange() );
		}

		wrap.appendChild( statusCard() );

		const body = el( 'div', { class: 'ss-stack', 'aria-busy': S.reportState === 'loading' ? 'true' : 'false' } );
		R.reportBody = body;
		wrap.appendChild( body );

		if ( S.reportState === 'loading' && ! S.report ) {
			body.appendChild( reportSkeleton() );
			return;
		}
		if ( S.reportState === 'error' ) {
			body.appendChild( errorCard( S.reportErr, loadReport ) );
			return;
		}
		if ( S.reportState === 'loading' ) {
			body.style.opacity = '0.6';
		}
		const rep = S.report || {};
		const t = rep.totals || {};
		// Staggered entrance and KPI count-up run once per freshly loaded report, not on every re-render.
		const fresh = ! countedReports.has( rep );
		countedReports.add( rep );
		if ( fresh ) {
			body.classList.add( 'is-enter' );
		}
		if ( ! t.responses ) {
			body.appendChild( reportEmpty( t ) );
			return;
		}
		body.appendChild( el( 'div', { class: 'ss-grid' }, kpis( t, rep, fresh ) ) );
		if ( rep.mixed_currency ) {
			const code = ( rep.currency && rep.currency.code ) || '';
			body.appendChild( el( 'p', { class: 'ss-note' }, ico( 'info' ), el( 'span', { text: sprintf( /* translators: %s: store base currency code, e.g. USD */ __( 'Revenue is converted to %s, your store’s main currency, so orders paid in other currencies add up correctly.', 'sourcesay' ), code ) } ) ) );
		}
		const cards = [
			channelsCard( rep ),
			el( 'div', { class: 'ss-grid' },
				el( 'div', { class: 'ss-span-8' }, trendCard( rep ) ),
				el( 'div', { class: 'ss-span-4' }, nvrCard( rep ) )
			),
			toldCard( rep ),
			el( 'section', { class: 'ss-card' }, howToRead() ),
		];
		add( body, applyHook( 'sourcesay.reports.cards', cards, { report: rep, range: S.range, ui: UI } ) );
		const promo = proCard();
		if ( promo ) {
			body.appendChild( promo );
		}
	}

	/* SourceSay Pro card: Reports only, dismissible, hidden when Pro is active (server sets promo.show). */
	function proCard() {
		const p = cfg.promo || {};
		const url = String( p.proUrl || '' );
		if ( ! p.show || ! /^https:\/\//.test( url ) ) {
			return null;
		}
		const row = ( icon, title, text ) => el( 'li', { class: 'ss-pro__item' },
			el( 'span', { class: 'ss-pro__icon' }, ico( icon ) ),
			el( 'span', { class: 'ss-pro__text' }, el( 'strong', { text: title } ), ' ' + text )
		);
		const card = el( 'section', { class: 'ss-card ss-pro', 'aria-labelledby': 'ss-pro-title' },
			el( 'div', { class: 'ss-pro__intro' },
				el( 'p', { class: 'ss-pro__eyebrow' }, ico( 'sparkle' ), __( 'SourceSay Pro', 'sourcesay' ) ),
				el( 'h2', { class: 'ss-pro__title', id: 'ss-pro-title', text: __( 'Turn answers into decisions', 'sourcesay' ) } )
			),
			el( 'ul', { class: 'ss-pro__list' },
				row( 'chat', __( 'Ask more.', 'sourcesay' ), __( 'Follow-up questions, NPS and star ratings, with smart branching.', 'sourcesay' ) ),
				row( 'eye', __( 'See what your analytics miss.', 'sourcesay' ), __( 'What customers said, side by side with what WooCommerce tracked.', 'sourcesay' ) ),
				row( 'revenue', __( 'Know which channels bring repeat buyers.', 'sourcesay' ), __( 'Lifetime value for every channel.', 'sourcesay' ) ),
				row( 'send', __( 'Send answers where you work.', 'sourcesay' ), __( 'GA4, Meta, Klaviyo and FluentCRM.', 'sourcesay' ) ),
				row( 'palette', __( 'Client-ready reports.', 'sourcesay' ), __( 'With your own branding.', 'sourcesay' ) )
			),
			el( 'div', { class: 'ss-pro__foot' },
				el( 'p', { class: 'ss-pro__free', text: __( 'Everything you use today stays free, with unlimited answers.', 'sourcesay' ) } ),
				el( 'div', { class: 'ss-pro__actions' },
					el( 'a', { class: 'ss-btn ss-btn--primary', href: url, target: '_blank', rel: 'noopener' }, __( 'See SourceSay Pro', 'sourcesay' ), ico( 'external' ), el( 'span', { class: 'ss-sr', text: __( '(opens in a new tab)', 'sourcesay' ) } ) ),
					el( 'button', { type: 'button', class: 'ss-btn ss-btn--tertiary', text: __( 'Not now', 'sourcesay' ), on: { click: () => dismissPro( card ) } } )
				)
			)
		);
		return card;
	}

	function dismissPro( card ) {
		cfg.promo.show = false;
		const prev = card.previousElementSibling;
		card.remove();
		const sum = prev && prev.querySelector( 'summary' );
		if ( sum ) {
			sum.focus();
		}
		toast( 'info', __( 'Hidden for 90 days', 'sourcesay' ) );
		api( '/admin/dismiss', { method: 'POST', data: { key: 'pro_card' } } ).catch( ( err ) => toast( 'error', errText( err ) ) );
	}

	function customRange() {
		const from = el( 'input', { type: 'date', class: 'ss-input', id: 'ss-from', value: S.range.from, max: S.today || null } );
		const to = el( 'input', { type: 'date', class: 'ss-input', id: 'ss-to', value: S.range.to, max: S.today || null } );
		const err = el( 'p', { class: 'ss-field__error', id: 'ss-range-err', role: 'alert', hidden: true }, ico( 'warning' ), el( 'span' ) );
		const apply = () => {
			let msg = '';
			if ( ! from.value || ! to.value ) {
				msg = __( 'Pick a start and an end date.', 'sourcesay' );
			} else if ( from.value > to.value ) {
				msg = __( 'The start date must be on or before the end date.', 'sourcesay' );
			}
			if ( msg ) {
				err.hidden = false;
				err.lastChild.textContent = msg;
				( from.value ? to : from ).setAttribute( 'aria-invalid', 'true' );
				return;
			}
			S.range = { preset: 'custom', from: from.value, to: to.value };
			S.customOpen = false;
			render();
			loadReport();
		};
		[ from, to ].forEach( ( i ) => {
			i.setAttribute( 'aria-describedby', 'ss-range-err' );
			i.addEventListener( 'keydown', ( e ) => {
				if ( e.key === 'Enter' ) {
					apply();
				}
			} );
		} );
		return el( 'div', { class: 'ss-range__custom', role: 'group', 'aria-label': __( 'Custom date range', 'sourcesay' ) },
			el( 'div', { class: 'ss-field' }, el( 'label', { class: 'ss-field__label', for: 'ss-from', text: __( 'From', 'sourcesay' ) } ), from ),
			el( 'div', { class: 'ss-field' }, el( 'label', { class: 'ss-field__label', for: 'ss-to', text: __( 'To', 'sourcesay' ) } ), to ),
			el( 'button', { type: 'button', class: 'ss-btn ss-btn--primary', text: __( 'Apply range', 'sourcesay' ), on: { click: apply } } ),
			el( 'button', { type: 'button', class: 'ss-btn ss-btn--tertiary', text: __( 'Cancel', 'sourcesay' ), on: { click: () => {
				S.customOpen = false;
				render();
			} } } ),
			err
		);
	}

	function reportSkeleton() {
		const tile = () => el( 'div', { class: 'ss-card ss-span-3' }, el( 'div', { class: 'ss-kpi' },
			el( 'span', { class: 'ss-skel ss-skel--tile' } ),
			el( 'span', { class: 'ss-skel ss-skel--title', style: 'width:70%' } ),
			el( 'span', { class: 'ss-skel ss-skel--value' } ),
			el( 'span', { class: 'ss-skel', style: 'width:50%' } )
		) );
		const rows = [ 1, 2, 3, 4, 5 ].map( () => el( 'span', { class: 'ss-skel ss-skel--row' } ) );
		return el( 'div', { class: 'ss-stack', 'aria-hidden': 'true' },
			el( 'p', { class: 'ss-sr', text: __( 'Loading report…', 'sourcesay' ) } ),
			el( 'div', { class: 'ss-grid' }, tile(), tile(), tile(), tile() ),
			el( 'div', { class: 'ss-card' }, el( 'div', { class: 'ss-card__body' }, el( 'span', { class: 'ss-skel ss-skel--title' } ), el( 'div', { style: 'margin-top:20px' }, rows ) ) ),
			el( 'div', { class: 'ss-grid' },
				el( 'div', { class: 'ss-card ss-span-8' }, el( 'div', { class: 'ss-card__body' }, el( 'span', { class: 'ss-skel ss-skel--title' } ), el( 'span', { class: 'ss-skel ss-skel--block' } ) ) ),
				el( 'div', { class: 'ss-card ss-span-4' }, el( 'div', { class: 'ss-card__body' }, el( 'span', { class: 'ss-skel ss-skel--title' } ), el( 'span', { class: 'ss-skel ss-skel--block' } ) ) )
			)
		);
	}

	function reportEmpty( t ) {
		const paid = +t.paid_orders || 0;
		const off = surveyOff();
		if ( off ) {
			const on = el( 'button', { type: 'button', class: 'ss-btn ss-btn--primary', on: { click: ( e ) => {
				turnOn( e.currentTarget ).then( ( ok ) => {
					if ( ok ) {
						toast( 'success', __( 'Your survey is on. Customers will see it after their next order.', 'sourcesay' ) );
					}
				} );
			} } }, ico( 'check' ), __( 'Turn on survey', 'sourcesay' ) );
			return el( 'div', { class: 'ss-card' },
				el( 'div', { class: 'ss-empty' },
					el( 'span', { class: 'ss-empty__icon' }, ico( 'responses' ) ),
					el( 'h2', { class: 'ss-empty__title', text: __( 'Turn on your survey to start collecting answers', 'sourcesay' ) } ),
					el( 'p', { class: 'ss-empty__text', text: __( 'Your survey is off, so customers are not asked yet. Turn it on first. Answers show up here as soon as customers reply after checkout.', 'sourcesay' ) } ),
					el( 'ol', { class: 'ss-steps' },
						el( 'li', { text: __( 'Turn on the survey.', 'sourcesay' ) } ),
						el( 'li', { text: __( 'Customers see the question on the order confirmation page after their next order.', 'sourcesay' ) } ),
						el( 'li', { text: __( 'Come back here. Answers appear once orders are paid (Processing or Completed).', 'sourcesay' ) } )
					),
					el( 'div', { class: 'ss-empty__actions' },
						on,
						el( 'a', { class: 'ss-btn ss-btn--secondary', href: '#survey' }, ico( 'eye' ), __( 'Preview the survey', 'sourcesay' ) )
					)
				)
			);
		}
		const text = paid
			? sprintf( /* translators: %s: number of paid orders */ _n( 'There was %s paid order in this range, but nobody has answered yet.', 'There were %s paid orders in this range, but nobody has answered yet.', paid, 'sourcesay' ), fmtNum( paid ) )
			: __( 'Answers show up here as soon as customers reply on the order confirmation page. No numbers are shown until real answers arrive.', 'sourcesay' );
		return el( 'div', { class: 'ss-card' },
			el( 'div', { class: 'ss-empty' },
				el( 'span', { class: 'ss-empty__icon' }, ico( 'responses' ) ),
				el( 'h2', { class: 'ss-empty__title', text: __( 'No answers yet', 'sourcesay' ) } ),
				el( 'p', { class: 'ss-empty__text', text } ),
				el( 'ol', { class: 'ss-steps' },
					el( 'li', { text: __( 'Place a test order in your store, for example with the Cash on delivery or Check payments method.', 'sourcesay' ) } ),
					el( 'li', { text: __( 'Answer the question on the order confirmation page.', 'sourcesay' ) } ),
					el( 'li', { text: __( 'Come back here. The answer appears once the order is paid (Processing or Completed).', 'sourcesay' ) } )
				),
				el( 'div', { class: 'ss-empty__actions' },
					el( 'a', { class: 'ss-btn ss-btn--primary', href: siteHome(), target: '_blank', rel: 'noopener' }, ico( 'bag' ), __( 'Open your store', 'sourcesay' ), el( 'span', { class: 'ss-sr', text: __( '(opens in a new tab)', 'sourcesay' ) } ) ),
					el( 'a', { class: 'ss-btn ss-btn--secondary', href: '#survey' }, ico( 'eye' ), __( 'Preview the survey', 'sourcesay' ) ),
					cfg.ordersUrl ? el( 'a', { class: 'ss-btn ss-btn--tertiary', href: cfg.ordersUrl, text: __( 'View orders', 'sourcesay' ) } ) : null
				)
			)
		);
	}

	/* ---------- Motion helpers (vanilla, reduced-motion aware) ---------- */
	const countedReports = new WeakSet();

	function reducedMotion() {
		return !! ( window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches );
	}

	/** Count a KPI from 0 to its value with an ease-out curve; the final frame always prints the exact formatted value. */
	function countUp( node, to, fmt ) {
		if ( reducedMotion() || ! ( to > 0 ) || ! window.requestAnimationFrame ) {
			return;
		}
		const dur = 900;
		let start = 0;
		const step = ( now ) => {
			start = start || now;
			const k = Math.min( 1, ( now - start ) / dur );
			if ( k > 0.05 && ! node.isConnected ) {
				return; // Re-rendered away.
			}
			node.textContent = fmt( k < 1 ? to * ( 1 - Math.pow( 2, -10 * k ) ) : to );
			if ( k < 1 ) {
				window.requestAnimationFrame( step );
			}
		};
		node.textContent = fmt( 0 );
		window.requestAnimationFrame( step );
	}

	/* ---------- Change vs the previous period ---------- */
	function prevInfo() {
		const p = S.report && S.report.previous;
		return p && p.range && p.range.from ? p : null;
	}

	function prevRangeText() {
		const p = prevInfo();
		return p ? sprintf( /* translators: 1: start date, 2: end date */ __( '%1$s to %2$s', 'sourcesay' ), fmtDay( p.range.from ), fmtDay( p.range.to, true ) ) : '';
	}

	function fmtPts( v ) {
		const a = Math.abs( v );
		return new Intl.NumberFormat( LOCALE, { maximumFractionDigits: a < 10 ? 1 : 0 } ).format( a );
	}

	/**
	 * Small pill: "+12%" / "−8%" (or "+3 pts" for rates), green when better, red when worse,
	 * neutral "New" when the previous period had nothing. Hover/focus shows the previous range and value.
	 *
	 * @param {number}  cur     Value in this range.
	 * @param {number}  prev    Value in the previous range.
	 * @param {Object}  o       { pts: bool (rate, show percentage points), prevText: formatted previous value, focusable: bool, base: previous denominator for rates }
	 * @return {Element|null}
	 */
	function delta( cur, prev, o ) {
		o = o || {};
		if ( ! prevInfo() ) {
			return null;
		}
		cur = +cur || 0;
		prev = +prev || 0;
		const empty = o.pts ? ! ( +o.base ) : prev === 0;
		let cls = 'flat';
		let text;
		let arrow = null;
		let say;
		if ( empty ) {
			if ( ! cur ) {
				return null;
			}
			text = __( 'New', 'sourcesay' );
			say = __( 'Nothing in the previous period to compare with.', 'sourcesay' );
		} else {
			let diff;
			if ( o.pts ) {
				diff = ( cur - prev ) * 100;
				diff = Math.round( diff * 10 ) / 10;
				text = diff === 0 ? __( 'No change', 'sourcesay' ) : sprintf( /* translators: %s: percentage points */ diff > 0 ? __( '+%s pts', 'sourcesay' ) : __( '−%s pts', 'sourcesay' ), fmtPts( diff ) );
			} else {
				diff = Math.round( ( ( cur - prev ) / prev ) * 100 );
				text = diff === 0 ? __( 'No change', 'sourcesay' ) : ( diff > 0 ? '+' : '−' ) + new Intl.NumberFormat( LOCALE ).format( Math.abs( diff ) ) + '%';
			}
			if ( diff > 0 ) {
				cls = 'up';
				arrow = 'arrow-up';
			} else if ( diff < 0 ) {
				cls = 'down';
				arrow = 'arrow-down';
			}
			say = diff > 0 ? __( 'Up from the previous period.', 'sourcesay' ) : ( diff < 0 ? __( 'Down from the previous period.', 'sourcesay' ) : __( 'Same as the previous period.', 'sourcesay' ) );
		}
		const tipText = sprintf( /* translators: 1: date range, 2: value in that range */ __( 'Previous period, %1$s: %2$s', 'sourcesay' ), prevRangeText(), o.prevText !== undefined ? o.prevText : fmtNum( prev ) );
		return el( 'span', { class: 'ss-delta ss-delta--' + cls, tabindex: o.focusable ? '0' : null },
			arrow ? ico( arrow ) : null,
			el( 'span', { class: 'ss-delta__val', text } ),
			el( 'span', { class: 'ss-delta__tip', role: 'tooltip' }, el( 'span', { class: 'ss-sr', text: ' ' + say + ' ' } ), tipText )
		);
	}

	function kpis( t, rep, animate ) {
		const p = ( prevInfo() && rep.previous.totals ) || {};
		const tile = ( icon, tone, label, num, fmt, change, meta, help ) => {
			const value = el( 'span', { class: 'ss-kpi__value', text: fmt( num ) } );
			if ( animate ) {
				countUp( value, +num || 0, fmt );
			}
			return el( 'div', { class: 'ss-card ss-span-3 ss-kpi-card' + ( tone ? ' ss-kpi-card--' + tone : '' ) },
				el( 'div', { class: 'ss-kpi' },
					el( 'span', { class: 'ss-kpi__icon' + ( tone ? ' ss-kpi__icon--' + tone : '' ) }, ico( icon ) ),
					el( 'span', { class: 'ss-kpi__label' }, labelWithTip( label, help ) ),
					el( 'span', { class: 'ss-kpi__valrow' }, value, change ),
					el( 'span', { class: 'ss-kpi__meta' }, meta )
				)
			);
		};
		const paid = +t.paid_orders || 0;
		const skipped = +t.skipped || 0;
		const skipOff = !! S.saved && ! S.saved.allow_skip && ! skipped;
		const skipMeta = skipOff ? __( 'Paid orders that answered', 'sourcesay' ) : el( 'span', { class: 'ss-kpi__skip' },
			sprintf( /* translators: 1: number of skips, 2: share of paid orders */ _n( '%1$s skipped (%2$s)', '%1$s skipped (%2$s)', skipped, 'sourcesay' ), fmtNum( skipped ), fmtPct( t.skip_rate, 1 ) ),
			tip( __( 'Skipped', 'sourcesay' ), __( 'Customers who pressed the skip button (for example “Prefer not to say”). Skips do not count as answers, so they never change your channel numbers or the response rate.', 'sourcesay' ) )
		);
		return [
			tile( 'responses', '', __( 'Answers', 'sourcesay' ), t.responses, fmtNum,
				delta( t.responses, p.responses, { focusable: true } ),
				sprintf( /* translators: %s: number of paid orders */ _n( 'From %s paid order', 'From %s paid orders', paid, 'sourcesay' ), fmtNum( paid ) ),
				__( 'How many customers picked an answer. Skips and test orders are not counted.', 'sourcesay' ) ),
			tile( 'percent', 'cream', __( 'Response rate', 'sourcesay' ), t.response_rate, ( v ) => fmtPct( v, 1 ),
				delta( t.response_rate, p.response_rate, { pts: true, base: p.paid_orders, focusable: true, prevText: fmtPct( p.response_rate, 1 ) } ),
				skipMeta,
				__( 'Out of every paid order in this date range, the share whose customer answered the question. 30% means 3 in 10 customers answered. The change is shown in percentage points (pts).', 'sourcesay' ) ),
			tile( 'revenue', 'green', __( 'Revenue from answered orders', 'sourcesay' ), t.revenue, fmtMoney,
				delta( t.revenue, p.revenue, { focusable: true, prevText: fmtMoney( p.revenue ) } ),
				__( 'Paid orders, minus refunds', 'sourcesay' ),
				__( 'The total spent on orders whose customer answered, after refunds. Orders without an answer are not included.', 'sourcesay' ) ),
			tile( 'receipt', 'orange', __( 'Average order value', 'sourcesay' ), t.aov, fmtMoney,
				delta( t.aov, p.aov, { focusable: true, prevText: fmtMoney( p.aov ) } ),
				__( 'Across answered orders', 'sourcesay' ),
				__( 'Revenue from answered orders divided by the number of those orders: what one of these customers spends per order.', 'sourcesay' ) ),
		];
	}

	function channelLabel( id ) {
		const ch = ( ( S.report && S.report.channels ) || [] ).find( ( c ) => c.answer_id === id );
		if ( ch ) {
			return ch;
		}
		const o = S.saved && S.saved.options.find( ( x ) => x.id === id );
		return { label: o ? o.label : id, icon: o ? o.icon : 'question' };
	}

	/**
	 * Where answers come from: one 100% bar, one colour per channel, legend with the shares.
	 * Up to 8 channels get their own colour; from the 9th on the smallest fold into one grey "more" block.
	 */
	/** Channel key => colour (same rule as the share bar), so a channel looks the same in every chart and icon. */
	function chanColors( chans ) {
		const ranked = chans.filter( ( c ) => +c.responses > 0 ).sort( ( a, b ) => ( b.responses - a.responses ) || ( b.revenue - a.revenue ) );
		const keep = ranked.length > 8 ? 7 : 8;
		return new Map( ranked.map( ( c, i ) => [ c.answer_id || c.label, i < keep ? 'var(--ss-cat-' + ( i + 1 ) + ')' : 'var(--ss-cat-rest)' ] ) );
	}

	function shareBar( chans ) {
		const total = chans.reduce( ( a, c ) => a + ( +c.responses || 0 ), 0 );
		if ( ! total ) {
			return null;
		}
		// ponytail: colour slot = answer rank in this range, so a channel can change colour between ranges; pin slots to survey order if owners compare ranges side by side.
		const ranked = chans.filter( ( c ) => +c.responses > 0 ).sort( ( a, b ) => ( b.responses - a.responses ) || ( b.revenue - a.revenue ) );
		const keep = ranked.length > 8 ? 7 : 8;
		const parts = ranked.slice( 0, keep ).map( ( c, i ) => ( { label: c.label, n: +c.responses, rev: +c.revenue || 0, color: 'var(--ss-cat-' + ( i + 1 ) + ')' } ) );
		const rest = ranked.slice( keep );
		if ( rest.length ) {
			parts.push( {
				label: sprintf( /* translators: %d: number of smaller channels grouped together */ _n( '%d more channel', '%d more channels', rest.length, 'sourcesay' ), rest.length ),
				n: rest.reduce( ( a, c ) => a + ( +c.responses || 0 ), 0 ),
				rev: rest.reduce( ( a, c ) => a + ( +c.revenue || 0 ), 0 ),
				color: 'var(--ss-cat-rest)',
			} );
		}
		const wrap = el( 'div', { class: 'ss-share' } );
		const tip = el( 'div', { class: 'ss-share__tip', hidden: true, 'aria-hidden': 'true' } );
		const segs = parts.map( ( p, i ) => el( 'span', { class: 'ss-share__seg', style: '--ss-c:' + p.color + ';--ss-i:' + i + ';flex:' + p.n + ' 1 0' } ) );
		const items = parts.map( ( p ) => el( 'li', { class: 'ss-share__item', style: '--ss-c:' + p.color },
			el( 'span', { class: 'ss-swatch', 'aria-hidden': 'true' } ),
			el( 'span', { text: p.label } ),
			el( 'strong', { text: fmtPct( p.n / total ) } )
		) );
		const focus = ( i ) => {
			wrap.classList.toggle( 'is-hovering', i >= 0 );
			segs.forEach( ( s, j ) => s.classList.toggle( 'is-active', j === i ) );
			items.forEach( ( s, j ) => s.classList.toggle( 'is-active', j === i ) );
			if ( i < 0 ) {
				tip.hidden = true;
				return;
			}
			const p = parts[ i ];
			tip.textContent = '';
			add( tip, [
				el( 'strong', { text: p.label } ),
				el( 'span', { style: 'display:block', text: sprintf( /* translators: 1: number of answers, 2: share of all answers */ _n( '%1$s answer (%2$s)', '%1$s answers (%2$s)', p.n, 'sourcesay' ), fmtNum( p.n ), fmtPct( p.n / total ) ) } ),
				el( 'span', { style: 'display:block', text: sprintf( /* translators: %s: revenue amount */ __( '%s revenue', 'sourcesay' ), fmtMoney( p.rev ) ) } ),
			] );
			tip.hidden = false;
			const s = segs[ i ];
			const half = tip.offsetWidth / 2;
			tip.style.left = Math.min( Math.max( s.offsetLeft + s.offsetWidth / 2, half ), wrap.clientWidth - half ) + 'px';
			tip.style.top = s.offsetTop + 'px';
		};
		segs.forEach( ( s, i ) => s.addEventListener( 'pointerenter', () => focus( i ) ) );
		items.forEach( ( s, i ) => s.addEventListener( 'pointerenter', () => focus( i ) ) );
		wrap.addEventListener( 'pointerleave', () => focus( -1 ) );
		return add( wrap, [
			el( 'div', { class: 'ss-share__head' },
				el( 'span', { class: 'ss-share__title', text: __( 'Where answers come from', 'sourcesay' ) } ),
				el( 'span', { class: 'ss-share__note', text: sprintf( /* translators: %s: number of answers */ _n( 'Share of %s answer', 'Share of %s answers', total, 'sourcesay' ), fmtNum( total ) ) } )
			),
			el( 'div', { class: 'ss-share__bar', 'aria-hidden': 'true' }, segs ),
			el( 'ul', { class: 'ss-share__list', 'aria-label': __( 'Share of answers by channel', 'sourcesay' ) }, items ),
			tip,
		] );
	}

	function channelsCard( rep ) {
		const chans = rep.channels || [];
		const maxShare = Math.max( 0.0001, ...chans.map( ( c ) => Math.max( +c.share_responses || 0, +c.share_revenue || 0 ) ) );
		const colors = chanColors( chans );

		const legend = el( 'div', { class: 'ss-legend', 'aria-hidden': 'true' },
			el( 'span', { class: 'ss-legend__item' }, el( 'span', { class: 'ss-swatch ss-swatch--responses' } ), __( 'Share of answers', 'sourcesay' ) ),
			el( 'span', { class: 'ss-legend__item' }, el( 'span', { class: 'ss-swatch' } ), __( 'Share of revenue', 'sourcesay' ) )
		);

		const changeNote = prevInfo() ? ' ' + sprintf( /* translators: %s: previous date range */ __( 'The small pill compares with the previous period (%s). Hover it to see the earlier number.', 'sourcesay' ), prevRangeText() ) : '';
		const L = {
			chan: __( 'Channel', 'sourcesay' ),
			resp: __( 'Answers', 'sourcesay' ),
			rev: __( 'Revenue', 'sourcesay' ),
			aov: __( 'Average order', 'sourcesay' ),
			bars: __( 'Answers vs revenue', 'sourcesay' ),
			gap: __( 'Revenue gap', 'sourcesay' ),
		};
		const rows = chans.map( ( c, i ) => {
			const sr = +c.share_responses || 0;
			const sv = +c.share_revenue || 0;
			const pts = Math.round( ( sv - sr ) * 100 );
			let badge;
			if ( pts >= 3 ) {
				badge = el( 'span', { class: 'ss-badge ss-badge--up' }, ico( 'arrow-up' ), sprintf( /* translators: %d: percentage points */ __( '+%d pts', 'sourcesay' ), pts ) );
			} else if ( pts <= -3 ) {
				badge = el( 'span', { class: 'ss-badge ss-badge--down' }, ico( 'arrow-down' ), sprintf( /* translators: %d: percentage points */ __( '−%d pts', 'sourcesay' ), Math.abs( pts ) ) );
			} else {
				badge = el( 'span', { class: 'ss-badge ss-badge--off', text: __( 'Even', 'sourcesay' ) } );
			}
			const bar = ( share, cls ) => el( 'span', { class: 'ss-dual__track' }, el( 'span', { class: 'ss-dual__fill' + cls, style: 'width:' + Math.max( share > 0 ? 2 : 0, ( share / maxShare ) * 100 ).toFixed( 1 ) + '%;animation-delay:' + ( i * 40 ) + 'ms' } ) );
			return el( 'tr', null,
				el( 'td', { class: 'ss-col-chan' },
					el( 'span', { class: 'ss-chan' },
						el( 'span', { class: 'ss-chan__rank', 'aria-hidden': 'true', text: String( i + 1 ) } ),
						el( 'span', colors.has( c.answer_id || c.label ) ? { class: 'ss-chan__icon ss-chan__icon--cat', style: '--ss-c:' + colors.get( c.answer_id || c.label ) } : { class: 'ss-chan__icon' }, ico( c.icon || ( c.answer_id === 'other' ? 'question' : 'tag' ) ) ),
						el( 'span', { text: c.label } )
					)
				),
				el( 'td', { class: 'is-num', 'data-label': L.resp }, el( 'span', { class: 'ss-numcell' }, el( 'span', { text: fmtNum( c.responses ) } ), delta( c.responses, c.prev_responses ) ) ),
				el( 'td', { class: 'is-num', 'data-label': L.rev }, el( 'span', { class: 'ss-numcell' }, el( 'span', { text: fmtMoney( c.revenue ) } ), delta( c.revenue, c.prev_revenue, { prevText: fmtMoney( c.prev_revenue ) } ) ) ),
				el( 'td', { class: 'is-num', 'data-label': L.aov, text: fmtMoney( c.aov ) } ),
				el( 'td', { class: 'ss-col-bars', 'data-label': L.bars },
					el( 'span', { class: 'ss-dual', 'aria-hidden': 'true' },
						bar( sr, '' ), el( 'span', { class: 'ss-dual__pct', text: fmtPct( sr ) } ),
						bar( sv, ' ss-dual__fill--revenue' ), el( 'span', { class: 'ss-dual__pct ss-dual__pct--revenue', text: fmtPct( sv ) } )
					),
					el( 'span', { class: 'ss-sr', text: sprintf( /* translators: 1: share of answers, 2: share of revenue */ __( '%1$s of answers, %2$s of revenue', 'sourcesay' ), fmtPct( sr ), fmtPct( sv ) ) } )
				),
				el( 'td', { 'data-label': L.gap }, badge )
			);
		} );

		return card( { icon: 'chart', title: __( 'Channels', 'sourcesay' ), desc: __( 'Ranked by revenue. A revenue bar longer than its answers bar means that channel brings bigger orders.', 'sourcesay' ), actions: legend },
			insightsBlock( rep ),
			shareBar( chans ),
			el( 'div', { class: 'ss-table-wrap' },
				el( 'table', { class: 'ss-table ss-chan-table' },
					el( 'caption', { class: 'ss-sr', text: __( 'Answers and revenue by channel', 'sourcesay' ) } ),
					el( 'thead', null, el( 'tr', null,
						el( 'th', { scope: 'col', text: L.chan } ),
						el( 'th', { scope: 'col', class: 'is-num' }, labelWithTip( L.resp, __( 'How many customers picked this channel.', 'sourcesay' ) + changeNote ) ),
						el( 'th', { scope: 'col', class: 'is-num' }, labelWithTip( L.rev, __( 'Total spent by these customers on the orders where they answered, after refunds.', 'sourcesay' ) + changeNote ) ),
						el( 'th', { scope: 'col', class: 'is-num' }, labelWithTip( L.aov, __( 'What a customer from this channel spends per order, on average.', 'sourcesay' ) ) ),
						el( 'th', { scope: 'col', class: 'ss-col-bars' }, labelWithTip( L.bars, __( 'Top bar (blue): this channel’s share of all answers. Bottom bar (green): its share of all revenue from answered orders. A longer green bar means bigger spenders.', 'sourcesay' ) ) ),
						el( 'th', { scope: 'col' }, labelWithTip( L.gap, __( 'Share of revenue minus share of answers, in percentage points. +5 pts means this channel brings 5 points more of your revenue than of your answers.', 'sourcesay' ) ) )
					) ),
					el( 'tbody', null, rows )
				)
			)
		);
	}

	/* ------------------------------------------------------------------ */
	/* Insights, status, how-to                                           */
	/* ------------------------------------------------------------------ */
	const INSIGHT_MIN = 20;

	function insightsBlock( rep ) {
		const t = rep.totals || {};
		const n = +t.responses || 0;
		if ( n < INSIGHT_MIN ) {
			const more = INSIGHT_MIN - n;
			return el( 'p', { class: 'ss-insight ss-insight--wait' }, ico( 'lightbulb' ), el( 'span', { text: sprintf( /* translators: 1: answers needed for insights, 2: answers still missing */ _n( 'Plain-English insights appear once you have %1$d answers in the selected range. %2$d more answer to go.', 'Plain-English insights appear once you have %1$d answers in the selected range. %2$d more answers to go.', more, 'sourcesay' ), INSIGHT_MIN, more ) } ) );
		}
		const strong = ( c ) => el( 'strong', { text: c.label } );
		const chans = ( rep.channels || [] ).filter( ( c ) => c.responses >= 3 );
		const out = [];
		const best = chans.map( ( c ) => ( { c, g: ( c.share_revenue || 0 ) - ( c.share_responses || 0 ) } ) ).sort( ( a, b ) => b.g - a.g )[ 0 ];
		if ( best && best.g >= 0.04 ) {
			out.push( fill( /* translators: 1: channel, 2: share of answers, 3: share of revenue */ __( '%1$s customers are %2$s of answers but %3$s of revenue.', 'sourcesay' ), [ strong( best.c ), fmtPct( best.c.share_responses ), fmtPct( best.c.share_revenue ) ] ) );
		}
		const avg = +t.aov || 0;
		if ( avg > 0 ) {
			const byAov = chans.filter( ( c ) => c.responses >= 5 ).map( ( c ) => ( { c, d: c.aov / avg - 1 } ) ).sort( ( a, b ) => b.d - a.d );
			const hi = byAov[ 0 ];
			const lo = byAov[ byAov.length - 1 ];
			if ( hi && hi.d >= 0.15 ) {
				out.push( fill( /* translators: 1: channel, 2: percent more, 3: channel average order, 4: store average order */ __( '%1$s customers spend %2$s more per order than average (%3$s vs %4$s).', 'sourcesay' ), [ strong( hi.c ), fmtPct( hi.d ), fmtMoney( hi.c.aov ), fmtMoney( avg ) ] ) );
			}
			if ( lo && lo !== hi && lo.d <= -0.15 ) {
				out.push( fill( /* translators: 1: channel, 2: percent less */ __( '%1$s customers spend %2$s less per order than average.', 'sourcesay' ), [ strong( lo.c ), fmtPct( -lo.d ) ] ) );
			}
		}
		const top = ( rep.channels || [] ).slice().sort( ( a, b ) => b.responses - a.responses )[ 0 ];
		if ( top && top.share_responses >= 0.15 ) {
			const inv = 1 / top.share_responses;
			const r = Math.round( inv );
			out.push( Math.abs( inv - r ) < 0.15 && r >= 2
				? fill( /* translators: 1: channel, 2: N in "1 in N" */ __( '1 in %2$s answers name %1$s, more than any other channel.', 'sourcesay' ), [ strong( top ), String( r ) ] )
				: fill( /* translators: 1: channel, 2: share of answers */ __( '%1$s is named in %2$s of answers, more than any other channel.', 'sourcesay' ), [ strong( top ), fmtPct( top.share_responses ) ] ) );
		}
		const v = rep.new_vs_returning || {};
		const nw = +( v.new && v.new.responses ) || 0;
		const rt = +( v.returning && v.returning.responses ) || 0;
		if ( nw + rt ) {
			out.push( fill( /* translators: %1$s: share of answers */ __( '%1$s of answers come from first-time customers.', 'sourcesay' ), [ el( 'strong', { text: fmtPct( nw / ( nw + rt ) ) } ) ] ) );
		}
		if ( ! out.length ) {
			out.push( __( 'No channel stands out yet: answers and revenue are spread evenly.', 'sourcesay' ) );
		}
		return el( 'div', { class: 'ss-insights' },
			el( 'h3', { class: 'ss-card__sub' }, ico( 'lightbulb' ), __( 'What stands out', 'sourcesay' ) ),
			el( 'ul', { class: 'ss-insights__list' }, out.slice( 0, 4 ).map( ( x ) => el( 'li', { class: 'ss-insight' }, el( 'span', null, x ) ) ) )
		);
	}

	function relTime( iso ) {
		const d = iso ? new Date( String( iso ).replace( ' ', 'T' ) ) : null;
		if ( ! d || isNaN( d ) ) {
			return __( 'No answers yet', 'sourcesay' );
		}
		const sec = Math.round( ( d.getTime() - Date.now() ) / 1000 );
		const rtf = new Intl.RelativeTimeFormat( LOCALE, { numeric: 'auto' } );
		const units = [ [ 60, 'second', 1 ], [ 3600, 'minute', 60 ], [ 86400, 'hour', 3600 ], [ 2592000, 'day', 86400 ], [ Infinity, 'month', 2592000 ] ];
		for ( const u of units ) {
			if ( Math.abs( sec ) < u[ 0 ] ) {
				return rtf.format( Math.round( sec / u[ 2 ] ), u[ 1 ] );
			}
		}
		return '';
	}

	/** Backend messages already explain the fix in plain words; add a shortcut where one exists. */
	function problemLink( p ) {
		return /disabl|off|option|answer/.test( String( p.code || '' ) ) ? el( 'a', { class: 'ss-btn ss-btn--secondary ss-btn--sm', href: '#survey', text: __( 'Open Survey', 'sourcesay' ) } ) : null;
	}

	function deleteTests( btn ) {
		btn.classList.add( 'is-busy' );
		api( '/admin/test-orders', { method: 'DELETE' } ).then( ( r ) => {
			const n = +( r && r.deleted ) || 0;
			toast( 'success', sprintf( /* translators: %d: number of orders */ _n( '%d test order deleted', '%d test orders deleted', n, 'sourcesay' ), n ) );
			btn.classList.remove( 'is-busy' );
			if ( S.status ) {
				S.status.test_orders = 0;
			}
			if ( S.setupOpen && S.tab === 'reports' ) {
				render();
			}
			loadStatus();
		} ).catch( ( err ) => {
			btn.classList.remove( 'is-busy' );
			toast( 'error', errText( err ) );
		} );
	}

	function openTest() {
		S.setupOpen = true;
		S.setup.step = 3;
		S.setup.fromStatus = !! ( S.status && S.status.setup_done );
		render( true );
	}

	function runSetupAgain() {
		clearInterval( S.setup.timer );
		S.setupOpen = true;
		S.setup = { step: 1, preset: S.setup.preset, test: 'idle', url: '', base: null, timer: 0, started: 0, live: false, fromStatus: false };
		render( true );
	}

	const isOffProblem = ( p ) => /disabl/.test( String( ( p && p.code ) || '' ) );
	/* Hints are not problems: the survey works, but a custom thank-you page needs the block or shortcode. */
	const isHint = ( p ) => !! p && p.code === 'custom_thankyou';

	function hintBoxes( list ) {
		return list.map( ( p ) => el( 'div', { class: 'ss-hintbox' },
			ico( 'lightbulb' ),
			el( 'div', { class: 'ss-hintbox__body' },
				el( 'span', { text: p.message } ),
				el( 'a', { class: 'ss-btn ss-btn--secondary ss-btn--sm', href: '#survey', on: { click: showMeHow } }, __( 'Show me how', 'sourcesay' ) )
			)
		) );
	}

	/** True when the owner has not switched the survey on yet (saved setting, or the status check says so). */
	function surveyOff() {
		if ( S.saved ) {
			return ! S.saved.enabled;
		}
		return !! ( S.status && ( S.status.problems || [] ).some( isOffProblem ) );
	}

	/**
	 * Switch the survey on: saves the stored settings with enabled=true (unsaved edits elsewhere stay as a draft).
	 *
	 * @return {Promise<boolean>}
	 */
	function turnOn( btn ) {
		if ( btn ) {
			btn.classList.add( 'is-busy' );
			btn.disabled = true;
		}
		const done = ( ok ) => {
			if ( btn ) {
				btn.classList.remove( 'is-busy' );
				btn.disabled = false;
			}
			return ok;
		};
		const ready = S.saved ? Promise.resolve( S.saved ) : api( '/admin/settings' ).then( ( r ) => r.settings );
		return ready.then( ( saved ) => {
			if ( ! ( saved.options || [] ).some( ( o ) => o.enabled ) ) {
				toast( 'error', __( 'Show at least one answer in the Survey tab first, then turn the survey on.', 'sourcesay' ) );
				return done( false );
			}
			return api( '/admin/settings', { method: 'POST', data: { settings: Object.assign( clone( saved ), { enabled: true } ) } } ).then( ( r ) => {
				const clean = ! isDirty();
				const keys = S.draft ? S.draft.options.map( ( o ) => o._k ) : [];
				S.saved = r.settings;
				if ( S.draft && clean ) {
					S.draft = withKeys( r.settings );
					S.draft.options.forEach( ( o, i ) => {
						if ( keys[ i ] ) {
							o._k = keys[ i ];
						}
					} );
				} else if ( S.draft ) {
					S.draft.enabled = true;
				}
				announce( __( 'Your survey is on.', 'sourcesay' ) );
				loadStatus();
				return done( true );
			} );
		} ).catch( ( err ) => {
			toast( 'error', sprintf( /* translators: %s: error message */ __( 'The survey was not turned on. %s', 'sourcesay' ), errText( err ) ) );
			return done( false );
		} );
	}

	function offCard( st ) {
		const others = ( st.problems || [] ).filter( ( p ) => ! isOffProblem( p ) && ! isHint( p ) );
		const hints = ( st.problems || [] ).filter( isHint );
		const tests = +st.test_orders || 0;
		const on = el( 'button', { type: 'button', class: 'ss-btn ss-btn--primary ss-btn--sm', on: { click: ( e ) => {
			turnOn( e.currentTarget ).then( ( ok ) => {
				if ( ok ) {
					toast( 'success', __( 'Your survey is on. Customers will see it after their next order.', 'sourcesay' ) );
				}
			} );
		} } }, ico( 'check' ), __( 'Turn on survey', 'sourcesay' ) );
		return el( 'section', { class: 'ss-status-card is-off', 'aria-label': __( 'Survey status', 'sourcesay' ) },
			el( 'span', { class: 'ss-status-card__icon' }, ico( 'eye' ) ),
			el( 'div', { class: 'ss-status-card__main' },
				el( 'p', { class: 'ss-status-card__title', text: __( 'Your survey is off', 'sourcesay' ) } ),
				el( 'p', { class: 'ss-muted', text: __( 'Customers do not see the question yet. Only you can see it, on test orders, until you turn it on.', 'sourcesay' ) } ),
				others.length ? el( 'ul', { class: 'ss-problems', 'aria-label': __( 'Also worth checking', 'sourcesay' ) }, others.map( ( p ) => el( 'li', null, el( 'span', { text: p.message } ), ' ', problemLink( p ) ) ) ) : null,
				hintBoxes( hints ),
				tests ? el( 'p', { class: 'ss-status-card__tests' }, sprintf( /* translators: %d: number of test orders */ _n( '%d test order exists. Test orders never appear in your reports.', '%d test orders exist. Test orders never appear in your reports.', tests, 'sourcesay' ), tests ) + ' ',
					el( 'button', { type: 'button', class: 'ss-btn ss-btn--tertiary ss-btn--sm', on: { click: ( e ) => deleteTests( e.currentTarget ) } }, ico( 'trash' ), __( 'Delete test orders', 'sourcesay' ) )
				) : null
			),
			el( 'div', { class: 'ss-status-card__actions' },
				on,
				el( 'button', { type: 'button', class: 'ss-btn ss-btn--secondary ss-btn--sm', on: { click: runSetupAgain } }, ico( 'refresh' ), __( 'Run setup again', 'sourcesay' ) ),
				el( 'button', { type: 'button', class: 'ss-btn ss-btn--tertiary ss-btn--sm', on: { click: openTest } }, ico( 'bag' ), __( 'Place a test order', 'sourcesay' ) )
			)
		);
	}

	function statusCard() {
		if ( S.statusState === 'error' ) {
			return el( 'div', { class: 'ss-status-card is-problem', role: 'status' },
				el( 'span', { class: 'ss-status-card__icon' }, ico( 'warning' ) ),
				el( 'div', { class: 'ss-status-card__main' },
					el( 'p', { class: 'ss-status-card__title', text: __( 'The survey status could not be checked', 'sourcesay' ) } ),
					el( 'p', { class: 'ss-muted', text: errText( S.statusErr ) } )
				),
				el( 'div', { class: 'ss-status-card__actions' }, el( 'button', { type: 'button', class: 'ss-btn ss-btn--neutral ss-btn--sm', on: { click: loadStatus } }, ico( 'refresh' ), __( 'Check again', 'sourcesay' ) ) )
			);
		}
		if ( ! S.status ) {
			return el( 'div', { class: 'ss-status-card', 'aria-hidden': 'true' }, el( 'span', { class: 'ss-skel', style: 'width:44px;height:44px;border-radius:12px' } ), el( 'div', { class: 'ss-status-card__main' }, el( 'span', { class: 'ss-skel ss-skel--title' } ), el( 'span', { class: 'ss-skel', style: 'width:60%' } ) ) );
		}
		const st = S.status;
		if ( surveyOff() ) {
			return offCard( st );
		}
		const problems = ( st.problems || [] ).filter( ( p ) => ! isOffProblem( p ) && ! isHint( p ) );
		const hints = ( st.problems || [] ).filter( isHint );
		const live = !! st.survey_live || ! problems.length;
		const checkout = { block: __( 'Block checkout', 'sourcesay' ), classic: __( 'Classic checkout', 'sourcesay' ) }[ st.checkout_type ] || __( 'Not detected', 'sourcesay' );
		const facts = el( 'dl', { class: 'ss-facts' },
			el( 'div', null, el( 'dt', { text: __( 'Last answer', 'sourcesay' ) } ), el( 'dd', { text: relTime( st.last_response_at ) } ) ),
			el( 'div', null, el( 'dt', { text: __( 'Last 30 days', 'sourcesay' ) } ), el( 'dd', { text: st.paid_orders_30d ? sprintf( /* translators: 1: response rate, 2: number of paid orders */ _n( '%1$s of %2$s paid order answered', '%1$s of %2$s paid orders answered', st.paid_orders_30d, 'sourcesay' ), fmtPct( st.response_rate_30d ), fmtNum( st.paid_orders_30d ) ) : __( 'No paid orders yet', 'sourcesay' ) } ) ),
			el( 'div', null, el( 'dt', { text: __( 'Checkout', 'sourcesay' ) } ), el( 'dd', { text: checkout } ) ),
			st.theme ? el( 'div', null, el( 'dt', { text: __( 'Theme', 'sourcesay' ) } ), el( 'dd', { text: st.theme } ) ) : null
		);
		const tests = +st.test_orders || 0;
		return el( 'section', { class: 'ss-status-card ' + ( live ? 'is-live' : 'is-problem' ), 'aria-label': __( 'Survey status', 'sourcesay' ) },
			el( 'span', { class: 'ss-status-card__icon' }, ico( live ? 'check' : 'warning' ) ),
			el( 'div', { class: 'ss-status-card__main' },
				el( 'p', { class: 'ss-status-card__title', text: live ? __( 'Your survey is live', 'sourcesay' ) : _n( 'One thing stops customers from seeing the survey', 'A few things stop customers from seeing the survey', problems.length || 1, 'sourcesay' ) } ),
				live ? el( 'p', { class: 'ss-muted', text: __( 'Customers see the question on the order confirmation page right after checkout.', 'sourcesay' ) } ) : null,
				problems.length ? el( 'ul', { class: 'ss-problems', 'aria-label': live ? __( 'Worth checking', 'sourcesay' ) : __( 'Problems', 'sourcesay' ) }, problems.map( ( p ) => el( 'li', null, el( 'span', { text: p.message } ), ' ', problemLink( p ) ) ) ) : null,
				hintBoxes( hints ),
				facts,
				tests ? el( 'p', { class: 'ss-status-card__tests' }, sprintf( /* translators: %d: number of test orders */ _n( '%d test order exists. Test orders never appear in your reports.', '%d test orders exist. Test orders never appear in your reports.', tests, 'sourcesay' ), tests ) + ' ',
					el( 'button', { type: 'button', class: 'ss-btn ss-btn--tertiary ss-btn--sm', on: { click: ( e ) => deleteTests( e.currentTarget ) } }, ico( 'trash' ), __( 'Delete test orders', 'sourcesay' ) )
				) : null
			),
			el( 'div', { class: 'ss-status-card__actions' },
				el( 'button', { type: 'button', class: 'ss-btn ss-btn--secondary ss-btn--sm', on: { click: openTest } }, ico( 'bag' ), __( 'Place a test order', 'sourcesay' ) ),
				el( 'a', { class: 'ss-btn ss-btn--tertiary ss-btn--sm', href: '#survey' }, __( 'Edit survey', 'sourcesay' ) )
			)
		);
	}

	function howToRead() {
		const item = ( title, text ) => el( 'li', null, el( 'strong', { text: title } ), ' ' + text );
		return details( __( 'How to read this report', 'sourcesay' ), [
			el( 'ul', { class: 'ss-howto' },
				item( __( 'Answers.', 'sourcesay' ), __( 'Each answer is one customer telling you where they first heard about you. One order can have one answer.', 'sourcesay' ) ),
				item( __( 'Revenue.', 'sourcesay' ), __( 'Only paid orders (Processing or Completed) count, and refunds are subtracted automatically. Orders without an answer are left out.', 'sourcesay' ) ),
				item( __( 'Share of answers vs share of revenue.', 'sourcesay' ), __( 'If a channel has 10% of answers but 20% of revenue, its customers spend about twice as much per order. Those are the channels to invest in.', 'sourcesay' ) ),
				item( __( 'Revenue gap.', 'sourcesay' ), __( 'The difference between the two shares, in percentage points. Green means bigger spenders than average, orange means smaller.', 'sourcesay' ) ),
				item( __( 'Follow-up answers.', 'sourcesay' ), __( 'The exact podcast, creator or friend customers named, grouped when the wording matches.', 'sourcesay' ) ),
				item( __( 'Compared with tracking.', 'sourcesay' ), __( 'The CSV export also has the source WooCommerce tracked for each order, so you can compare what customers say with what links and cookies saw.', 'sourcesay' ) ),
				item( __( 'Test orders.', 'sourcesay' ), __( 'Orders created with “Place a test order” are never counted here or in the export.', 'sourcesay' ) )
			),
		], false, 'lightbulb', 'yellow' );
	}

	/* ------------------------------------------------------------------ */
	/* First-run setup                                                    */
	/* ------------------------------------------------------------------ */
	const PRESET_ICONS = { general: 'bag', fashion: 'sparkle', b2b: 'chat', local: 'map-pin' };

	function loadStatus() {
		return api( '/admin/status' ).then( ( s ) => {
			const first = ! S.status;
			S.status = s;
			S.statusState = 'ready';
			if ( first && s && ! s.setup_done ) {
				S.setupOpen = true;
			}
			fillI18nNote();
			if ( S.tab === 'reports' && ! ( S.setupOpen && S.setup.step !== 1 ) ) {
				render();
			}
			return s;
		} ).catch( ( err ) => {
			S.statusState = 'error';
			S.statusErr = err;
			if ( S.tab === 'reports' && ! S.setupOpen ) {
				render();
			}
		} );
	}

	function setupStep( n ) {
		S.setup.step = n;
		render();
		const h = main.querySelector( '.ss-setup__title' );
		if ( h ) {
			h.focus();
		}
	}

	/** Marks setup as done (never changes whether the survey is on). */
	function markSetupDone() {
		if ( S.status ) {
			S.status.setup_done = true;
		}
		return api( '/admin/setup-done', { method: 'POST' } ).catch( () => {} );
	}

	/**
	 * Close the wizard and land on Reports.
	 *
	 * @param {string|null} msg Toast after a first run; null for none.
	 */
	function finishSetup( msg ) {
		const st = S.setup;
		clearInterval( st.timer );
		const wasFirstRun = ! st.fromStatus;
		S.setupOpen = false;
		S.setup = { step: 1, preset: st.preset, test: 'idle', url: '', base: null, timer: 0, started: 0, live: false };
		if ( wasFirstRun && ! st.live ) {
			markSetupDone();
			if ( msg ) {
				toast( 'success', msg );
			}
		}
		render( true );
		loadStatus();
		loadReport();
	}

	/** Setup step 3: switch the survey on, mark setup done, then celebrate in place. */
	function setupTurnOn( btn ) {
		turnOn( btn ).then( ( ok ) => {
			if ( ! ok ) {
				return;
			}
			clearInterval( S.setup.timer );
			S.setup.live = true;
			if ( ! S.setup.fromStatus ) {
				markSetupDone();
			}
			render();
			const h = main.querySelector( '.ss-celebrate__title' );
			if ( h ) {
				h.focus();
			}
		} );
	}

	function arrived( s, base ) {
		if ( ! s || ! base ) {
			return false;
		}
		// test_responses (answers on test orders) is what normally changes: reports exclude test data.
		return ( +s.test_responses || 0 ) > base.tests || ( +s.responses_total || 0 ) > base.total || ( !! s.last_response_at && s.last_response_at !== base.last );
	}

	function placeTest() {
		const st = S.setup;
		const w = window.open( '', '_blank' );
		if ( w ) {
			try {
				w.document.title = __( 'Creating your test order…', 'sourcesay' );
				w.document.body.textContent = __( 'Creating your test order…', 'sourcesay' );
			} catch ( e ) {}
		}
		st.test = 'creating';
		render();
		api( '/admin/status' ).then( ( s ) => {
			S.status = s;
			st.base = { total: +s.responses_total || 0, last: s.last_response_at || null, tests: +s.test_responses || 0 };
			return api( '/admin/test-order', { method: 'POST' } );
		} ).then( ( r ) => {
			st.url = r.url;
			st.orderId = +r.order_id || 0;
			if ( w ) {
				w.opener = null;
				w.location.href = r.url;
			}
			st.test = 'waiting';
			st.started = Date.now();
			clearInterval( st.timer );
			st.timer = setInterval( pollTest, 3000 );
			render();
		} ).catch( ( err ) => {
			if ( w ) {
				w.close();
			}
			st.test = 'error';
			st.err = err;
			render();
		} );
	}

	/** True when the test order carries an answer (order meta written on save). */
	function orderAnswered( id ) {
		if ( ! id || cfg.mock === true ) {
			return Promise.resolve( false );
		}
		return wp.apiFetch( { path: '/wc/v3/orders/' + id + '?_fields=id,meta_data' } )
			.then( ( o ) => ( o.meta_data || [] ).some( ( m ) => m.key === '_sourcesay_answer_id' && m.value ) )
			.catch( () => false );
	}

	function pollTest() {
		const st = S.setup;
		Promise.all( [ api( '/admin/status' ), orderAnswered( st.orderId ) ] ).then( ( [ s, answered ] ) => {
			S.status = s;
			if ( st.test !== 'waiting' ) {
				return;
			}
			if ( answered || arrived( s, st.base ) ) {
				clearInterval( st.timer );
				st.test = 'arrived';
				announce( __( 'It works. Your test answer arrived.', 'sourcesay' ) );
				if ( S.tab === 'reports' && S.setupOpen ) {
					render();
				}
			} else if ( Date.now() - st.started > 600000 ) {
				clearInterval( st.timer );
				st.test = 'timeout';
				if ( S.tab === 'reports' && S.setupOpen ) {
					render();
				}
			}
		} ).catch( () => {} );
	}

	function renderSetup( wrap ) {
		const st = S.setup;
		const steps = [ __( 'Your store', 'sourcesay' ), __( 'Your question', 'sourcesay' ), __( 'See it live', 'sourcesay' ) ];
		const firstRun = ! st.fromStatus;
		wrap.appendChild( pageHead(
			firstRun ? __( 'Set up SourceSay', 'sourcesay' ) : __( 'Test your survey', 'sourcesay' ),
			firstRun ? __( 'Three quick steps. Your survey stays off until you turn it on at the end, and you can change everything later.', 'sourcesay' ) : __( 'Place a test order and answer the question, just like a customer would.', 'sourcesay' ),
			st.live ? null : el( 'button', { type: 'button', class: 'ss-btn ss-btn--tertiary', text: firstRun ? __( 'Skip setup', 'sourcesay' ) : __( 'Close', 'sourcesay' ), on: { click: () => finishSetup( firstRun ? __( 'Setup skipped. Your survey is still off. Turn it on from Reports when you are ready.', 'sourcesay' ) : null ) } } )
		) );
		if ( firstRun ) {
			wrap.appendChild( el( 'ol', { class: 'ss-stepper', 'aria-label': __( 'Setup steps', 'sourcesay' ) }, steps.map( ( name, i ) => el( 'li', {
				class: 'ss-stepper__step' + ( i + 1 < st.step ? ' is-done' : '' ) + ( i + 1 === st.step ? ' is-current' : '' ),
				'aria-current': i + 1 === st.step ? 'step' : null,
			}, el( 'span', { class: 'ss-stepper__num', 'aria-hidden': 'true' }, i + 1 < st.step ? ico( 'check' ) : String( i + 1 ) ), el( 'span', { class: 'ss-stepper__name', text: name } ), i + 1 < st.step ? el( 'span', { class: 'ss-sr', text: __( '(done)', 'sourcesay' ) } ) : null ) ) ) );
		}
		if ( S.settingsState === 'error' ) {
			wrap.appendChild( errorCard( S.settingsErr, loadSettings ) );
			return;
		}
		if ( S.settingsState !== 'ready' ) {
			wrap.appendChild( el( 'div', { class: 'ss-card', 'aria-hidden': 'true' }, el( 'div', { class: 'ss-card__body' }, el( 'span', { class: 'ss-skel ss-skel--title' } ), el( 'span', { class: 'ss-skel ss-skel--block' } ) ) ) );
			return;
		}
		const foot = ( ...btns ) => el( 'div', { class: 'ss-setup__foot' }, btns );
		const back = ( n ) => el( 'button', { type: 'button', class: 'ss-btn ss-btn--neutral', text: __( 'Back', 'sourcesay' ), on: { click: () => setupStep( n ) } } );
		const title = ( text, sub ) => [ el( 'h2', { class: 'ss-setup__title', tabindex: '-1', text } ), sub ? el( 'p', { class: 'ss-muted', text: sub } ) : null ];

		if ( st.step === 1 ) {
			const keys = Object.keys( S.presets || {} );
			const name = uid( 'preset' );
			const cards = keys.map( ( k ) => {
				const opts = S.presets[ k ] || [];
				const sample = opts.slice( 0, 4 ).map( ( o ) => o.label ).join( ', ' );
				const extra = opts.length > 4 ? ' ' + sprintf( /* translators: %d: number of more answers */ _n( 'and %d more', 'and %d more', opts.length - 4, 'sourcesay' ), opts.length - 4 ) : '';
				return el( 'label', { class: 'ss-choice ss-preset' },
					el( 'input', { type: 'radio', name, value: k, checked: st.preset === k, on: { change: () => {
						st.preset = k;
						S.draft.options = withKeys( { options: S.presets[ k ] } ).options;
						changed();
					} } } ),
					el( 'span', { class: 'ss-chan__icon ss-preset__icon' }, ico( PRESET_ICONS[ k ] || 'storefront' ) ),
					el( 'span', { class: 'ss-choice__name', text: PRESET_LABELS[ k ] || k } ),
					el( 'span', { class: 'ss-field__help', text: sample + extra } )
				);
			} );
			wrap.appendChild( el( 'section', { class: 'ss-card ss-setup' },
				el( 'div', { class: 'ss-card__body' },
					title( __( 'What kind of store is this?', 'sourcesay' ), __( 'Pick the closest match. It fills in the answers customers can choose from.', 'sourcesay' ) ),
					keys.length ? el( 'fieldset', { class: 'ss-presets' }, el( 'legend', { class: 'ss-sr', text: __( 'Store type', 'sourcesay' ) } ), cards ) : el( 'p', { text: __( 'Your survey uses the standard answers.', 'sourcesay' ) } ),
					foot( el( 'button', { type: 'button', class: 'ss-btn ss-btn--primary', on: { click: () => setupStep( 2 ) } }, __( 'Continue', 'sourcesay' ) ) )
				)
			) );
			return;
		}

		if ( st.step === 2 ) {
			const d = S.draft;
			R.preview = el( 'div' );
			const next = el( 'button', { type: 'button', class: 'ss-btn ss-btn--primary', on: { click: () => {
				if ( ! isDirty() ) {
					setupStep( 3 );
					return;
				}
				next.classList.add( 'is-busy' );
				save().then( ( ok ) => {
					next.classList.remove( 'is-busy' );
					if ( ok ) {
						setupStep( 3 );
					}
				} );
			} } }, __( 'Save and continue', 'sourcesay' ) );
			wrap.appendChild( el( 'div', { class: 'ss-builder' },
				el( 'section', { class: 'ss-card ss-setup' }, el( 'div', { class: 'ss-card__body' },
					title( __( 'Check your question', 'sourcesay' ), __( 'This is what customers see after they pay. Reword it if you like.', 'sourcesay' ) ),
					el( 'div', { class: 'ss-stack', style: 'margin-top:20px' },
						textField( { label: __( 'Question text', 'sourcesay' ), value: d.question, max: 160, errKey: 'question', onInput: ( v ) => {
							d.question = v;
							changed();
						} } ),
						textField( { label: __( 'Thank-you message', 'sourcesay' ), value: d.thank_you, max: 120, errKey: 'thank_you', onInput: ( v ) => {
							d.thank_you = v;
							changed();
						} } ),
						el( 'p', { class: 'ss-field__help', text: __( 'Customers can always skip the question. Answers, icons, follow-up questions, colours and placement can be changed any time in the Survey tab.', 'sourcesay' ) } )
					),
					foot( back( 1 ), next )
				) ),
				el( 'div', { class: 'ss-builder__side' }, card( { icon: 'eye', tone: 'cream', title: __( 'Preview', 'sourcesay' ), desc: __( 'Click an answer to try it.', 'sourcesay' ) }, R.preview ) )
			) );
			renderPreview();
			updateErrors();
			return;
		}

		// Step 3: test order, then switch on.
		const off = surveyOff();
		if ( st.live ) {
			wrap.appendChild( el( 'section', { class: 'ss-card ss-setup' }, el( 'div', { class: 'ss-card__body' },
				el( 'div', { class: 'ss-celebrate', role: 'status' },
					el( 'span', { class: 'ss-celebrate__icon', 'aria-hidden': 'true' }, ico( 'check' ) ),
					el( 'p', { class: 'ss-celebrate__title', tabindex: '-1', text: __( 'Your survey is on', 'sourcesay' ) } ),
					el( 'p', { class: 'ss-muted', text: __( 'Customers will see it after their next order. Their answers show up in Reports.', 'sourcesay' ) } )
				),
				foot(
					S.status && S.status.test_orders ? el( 'button', { type: 'button', class: 'ss-btn ss-btn--neutral', on: { click: ( e ) => deleteTests( e.currentTarget ) } }, ico( 'trash' ), __( 'Delete test orders', 'sourcesay' ) ) : null,
					el( 'button', { type: 'button', class: 'ss-btn ss-btn--primary', on: { click: () => finishSetup( null ) } }, ico( 'chart' ), __( 'Go to Reports', 'sourcesay' ) )
				)
			) ) );
			return;
		}
		const problems = ( ( S.status && S.status.problems ) || [] ).filter( ( p ) => ! isOffProblem( p ) && ! isHint( p ) );
		const setupHints = ( ( S.status && S.status.problems ) || [] ).filter( isHint );
		let panel;
		if ( st.test === 'waiting' ) {
			panel = el( 'div', { class: 'ss-wait', role: 'status' },
				el( 'span', { class: 'ss-wait__pulse', 'aria-hidden': 'true' } ),
				el( 'div', null,
					el( 'p', { class: 'ss-status-card__title', text: __( 'Waiting for your answer…', 'sourcesay' ) } ),
					el( 'p', { class: 'ss-muted', text: __( 'Answer the question on the page that just opened. This page updates by itself.', 'sourcesay' ) } ),
					st.url ? el( 'a', { class: 'ss-btn ss-btn--tertiary ss-btn--sm', href: st.url, target: '_blank', rel: 'noopener' }, ico( 'external' ), __( 'Open the test order page again', 'sourcesay' ) ) : null
				)
			);
		} else if ( st.test === 'arrived' ) {
			panel = el( 'div', { class: 'ss-celebrate', role: 'status' },
				el( 'span', { class: 'ss-celebrate__icon', 'aria-hidden': 'true' }, ico( 'check' ) ),
				el( 'p', { class: 'ss-celebrate__title', text: __( 'It works. Your answer arrived.', 'sourcesay' ) } ),
				el( 'p', { class: 'ss-muted', text: off ? __( 'Customers do not see the question yet. Turn on your survey below when you are happy with it.', 'sourcesay' ) : __( 'Customers see this question right after checkout. Their answers show up in Reports.', 'sourcesay' ) } )
			);
		} else if ( st.test === 'timeout' ) {
			panel = el( 'div', { class: 'ss-notice ss-notice--warning', role: 'status' }, ico( 'warning' ), el( 'div', { class: 'ss-notice__body' },
				el( 'span', { text: __( 'No answer arrived in 10 minutes. If the question was missing on the test page, a caching plugin may be serving an old copy: exclude /checkout/order-received/ from caching and try again.', 'sourcesay' ) } ),
				el( 'button', { type: 'button', class: 'ss-btn ss-btn--secondary ss-btn--sm', text: __( 'Try again', 'sourcesay' ), on: { click: placeTest } } )
			) );
		} else {
			panel = el( 'div', { class: 'ss-test-start' },
				st.test === 'error' ? el( 'p', { class: 'ss-field__error', role: 'alert' }, ico( 'warning' ), el( 'span', { text: sprintf( /* translators: %s: error message */ __( 'The test order could not be created. %s', 'sourcesay' ), errText( st.err ) ) } ) ) : null,
				el( 'button', { type: 'button', class: 'ss-btn ' + ( off ? 'ss-btn--secondary' : 'ss-btn--primary' ) + ( st.test === 'creating' ? ' is-busy' : '' ), on: { click: placeTest } }, ico( 'bag' ), __( 'Place a test order', 'sourcesay' ), el( 'span', { class: 'ss-sr', text: __( '(opens in a new tab)', 'sourcesay' ) } ) ),
				el( 'p', { class: 'ss-field__help', text: __( 'Opens the order confirmation page in a new tab. The test order is marked as a test, sends no emails, and is never counted in your reports.', 'sourcesay' ) } )
			);
		}
		const hasTests = st.test === 'arrived' || ( S.status && S.status.test_orders );
		let actions;
		if ( off ) {
			actions = [
				el( 'button', { type: 'button', class: 'ss-btn ss-btn--secondary', text: firstRun ? __( 'Finish later, keep it off', 'sourcesay' ) : __( 'Close, keep it off', 'sourcesay' ), on: { click: () => finishSetup( firstRun ? __( 'Setup saved. Your survey stays off until you turn it on from Reports.', 'sourcesay' ) : null ) } } ),
				el( 'button', { type: 'button', class: 'ss-btn ss-btn--primary', on: { click: ( e ) => setupTurnOn( e.currentTarget ) } }, ico( 'check' ), __( 'Turn on my survey', 'sourcesay' ) ),
			];
		} else {
			actions = [ el( 'button', { type: 'button', class: 'ss-btn ss-btn--primary', on: { click: () => finishSetup( firstRun ? __( 'Setup finished. Your survey is on.', 'sourcesay' ) : null ) } }, ico( 'check' ), firstRun ? __( 'Finish setup', 'sourcesay' ) : __( 'Done', 'sourcesay' ) ) ];
		}
		wrap.appendChild( el( 'section', { class: 'ss-card ss-setup' }, el( 'div', { class: 'ss-card__body' },
			title( __( 'See it live', 'sourcesay' ), __( 'Place a test order and answer the question, just like a customer would.', 'sourcesay' ) ),
			off ? el( 'div', { class: 'ss-notice', style: 'margin-top:16px' }, ico( 'info' ), el( 'div', { class: 'ss-notice__body' }, el( 'span', { text: __( 'Your survey is still off. Test orders show it anyway: only you can see it on test orders until you turn it on.', 'sourcesay' ) } ) ) ) : null,
			problems.length ? el( 'div', { class: 'ss-notice ss-notice--warning', style: 'margin-top:16px' }, ico( 'warning' ), el( 'div', { class: 'ss-notice__body' }, el( 'span', { text: problems.map( ( p ) => p.message ).join( ' ' ) } ), el( 'a', { class: 'ss-btn ss-btn--secondary ss-btn--sm', href: '#survey', text: __( 'Open Survey', 'sourcesay' ) } ) ) ) : null,
			setupHints.length ? el( 'div', { style: 'margin-top:16px' }, hintBoxes( setupHints ) ) : null,
			el( 'div', { style: 'margin-top:20px' }, panel ),
			off ? el( 'p', { class: 'ss-field__help ss-setup__golive', text: __( 'Testing is optional. When you turn the survey on, customers see the question after their next order.', 'sourcesay' ) } ) : null,
			foot(
				firstRun ? back( 2 ) : null,
				hasTests ? el( 'button', { type: 'button', class: 'ss-btn ss-btn--neutral', on: { click: ( e ) => deleteTests( e.currentTarget ) } }, ico( 'trash' ), __( 'Delete test orders', 'sourcesay' ) ) : null,
				actions
			)
		) ) );
	}

	/* ------------------------------------------------------------------ */
	/* For developers (Settings)                                          */
	/* ------------------------------------------------------------------ */
	function devPanel() {
		const root = ( window.wpApiSettings && window.wpApiSettings.root ) || siteHome() + 'wp-json/';
		const base = root.replace( /\/+$/, '' ) + NS;
		const table = ( head, rows ) => el( 'div', { class: 'ss-table-wrap' }, el( 'table', { class: 'ss-table ss-dev-table' },
			el( 'thead', null, el( 'tr', null, head.map( ( h ) => el( 'th', { scope: 'col', text: h } ) ) ) ),
			el( 'tbody', null, rows.map( ( r ) => el( 'tr', null, r.map( ( c, i ) => el( 'td', null, i === 0 ? el( 'code', { text: c } ) : c ) ) ) ) )
		) );
		const hooks = table( [ __( 'Hook', 'sourcesay' ), __( 'Type', 'sourcesay' ), __( 'Arguments', 'sourcesay' ), __( 'Use it to', 'sourcesay' ) ], [
			[ 'sourcesay_should_display', __( 'Filter', 'sourcesay' ), '$show, $order, $context', __( 'Hide or force the survey for some orders. $context is "thankyou" or "account".', 'sourcesay' ) ],
			[ 'sourcesay_response_data', __( 'Filter', 'sourcesay' ), '$data, $order', __( 'Change the row before it is saved.', 'sourcesay' ) ],
			[ 'sourcesay_response_saved', __( 'Action', 'sourcesay' ), '$id, $data, $order', __( 'Send each new answer to a CRM, Slack or analytics. Also fires for skips: check that $data[\'answer_id\'] is not "__skip".', 'sourcesay' ) ],
			[ 'sourcesay_order_total_base', __( 'Filter', 'sourcesay' ), '$base, $order', __( 'Convert an order total to your main store currency when your currency plugin is not detected (Aelia, WooPayments, CURCY and WPML are built in).', 'sourcesay' ) ],
			[ 'sourcesay_loaded', __( 'Action', 'sourcesay' ), __( 'none', 'sourcesay' ), __( 'Start your add-on. Runs early on plugins_loaded, once every SourceSay function exists.', 'sourcesay' ) ],
			[ 'sourcesay_settings_schema', __( 'Filter', 'sourcesay' ), '$schema', __( 'Add your own settings: key => array( \'default\' => value, \'sanitize\' => callback ). They are saved with the survey settings and returned by GET /admin/settings. Without a sanitize callback the default is always saved.', 'sourcesay' ) ],
			[ 'sourcesay_survey_steps', __( 'Filter', 'sourcesay' ), '$steps, $order, $settings, $context', __( 'Add more questions after the first one. The list reaches the survey script as config.steps; show them with the sourcesay.survey.next JavaScript hook.', 'sourcesay' ) ],
			[ 'sourcesay_report_data', __( 'Filter', 'sourcesay' ), '$report, $range', __( 'Add your own sections to the report data. Cached for 5 minutes together with the report.', 'sourcesay' ) ],
			[ 'sourcesay_status', __( 'Filter', 'sourcesay' ), '$status', __( 'Add your own checks to the status card: append { code, message } to $status[\'problems\'], and set survey_live to false if the problem stops the survey.', 'sourcesay' ) ],
			[ 'sourcesay_csv_columns', __( 'Filter', 'sourcesay' ), '$columns', __( 'Add, remove or reorder CSV columns. The list is also the header row.', 'sourcesay' ) ],
			[ 'sourcesay_csv_row', __( 'Filter', 'sourcesay' ), '$row, $response, $order', __( 'Fill your own columns. $row is keyed by column name; $order is false when the order was deleted.', 'sourcesay' ) ],
		] );
		const jsHooks = table( [ __( 'JavaScript hook', 'sourcesay' ), __( 'Where', 'sourcesay' ), __( 'Arguments', 'sourcesay' ), __( 'Use it to', 'sourcesay' ) ], [
			[ 'sourcesay.tabs', __( 'This screen', 'sourcesay' ), 'tabs, { ui }', __( 'Add a tab: { id, label, icon, render( wrap, { ui } ) }.', 'sourcesay' ) ],
			[ 'sourcesay.reports.cards', __( 'Reports', 'sourcesay' ), 'cards, { report, range, ui }', __( 'Add cards below the channel table. Only shown when there are answers.', 'sourcesay' ) ],
			[ 'sourcesay.survey.cards', __( 'Survey', 'sourcesay' ), 'cards, { draft, changed, ui }', __( 'Add cards to the survey builder. Change your keys in draft, then call changed() so the Save bar turns on.', 'sourcesay' ) ],
			[ 'sourcesay.settings.cards', __( 'Settings', 'sourcesay' ), 'cards, { draft, changed, ui }', __( 'Add cards to Settings. Same draft rules as the Survey tab.', 'sourcesay' ) ],
			[ 'sourcesay.developer.items', __( 'This panel', 'sourcesay' ), 'items, { ui, restBase }', __( 'Add your own developer notes at the end of this panel.', 'sourcesay' ) ],
			[ 'sourcesay.survey.next', __( 'Thank-you page', 'sourcesay' ), 'null, { root, config, steps, answer, message, done }', __( 'Return an element to show the next question in the same card instead of the thank-you. Call done( message ) after the last one.', 'sourcesay' ) ],
		] );
		const jsEx = "// Load your script on WooCommerce > SourceSay with the 'wp-hooks' dependency.\nwp.hooks.addFilter( 'sourcesay.reports.cards', 'my-plugin', function ( cards, ctx ) {\n\tcards.push( ctx.ui.card( { title: 'My numbers' }, ctx.ui.el( 'p', { text: 'Hello' } ) ) );\n\treturn cards;\n} );";
		const ex1 = "// Do not ask customers who paid by bank transfer.\nadd_filter( 'sourcesay_should_display', function ( $show, $order, $context ) {\n\tif ( 'bacs' === $order->get_payment_method() ) {\n\t\treturn false;\n\t}\n\treturn $show;\n}, 10, 3 );";
		const ex2 = "// Add the answer to the order notes.\nadd_action( 'sourcesay_response_saved', function ( $id, $data, $order ) {\n\t$order->add_order_note( 'Heard about us: ' . $data['answer_label'] );\n}, 10, 3 );";
		const ex3 = "// Keep follow-up text short.\nadd_filter( 'sourcesay_response_data', function ( $data, $order ) {\n\t$data['followup_text'] = mb_substr( (string) $data['followup_text'], 0, 120 );\n\treturn $data;\n}, 10, 2 );";
		const rest = table( [ __( 'Route', 'sourcesay' ), __( 'Method', 'sourcesay' ), __( 'Who can call it', 'sourcesay' ), __( 'What it does', 'sourcesay' ) ], [
			[ NS + '/response', 'POST', __( 'Anyone with the order key', 'sourcesay' ), __( 'Saves an answer. Body: order_id, order_key, answer_id, followup_text, other_text. Send answer_id "__skip" to record a skip (only when the skip button is on). Limited to 10 calls per 10 minutes per visitor.', 'sourcesay' ) ],
			[ NS + '/admin/report', 'GET', __( 'Shop managers', 'sourcesay' ), __( 'Report data. Optional from and to (YYYY-MM-DD, store time).', 'sourcesay' ) ],
			[ NS + '/admin/settings', 'GET, POST', __( 'Shop managers', 'sourcesay' ), __( 'Read or save the survey settings.', 'sourcesay' ) ],
			[ NS + '/admin/status', 'GET', __( 'Shop managers', 'sourcesay' ), __( 'Is the survey live, and what is stopping it.', 'sourcesay' ) ],
			[ NS + '/admin/test-order', 'POST', __( 'Shop managers', 'sourcesay' ), __( 'Creates a test order and returns its confirmation page URL.', 'sourcesay' ) ],
			[ NS + '/admin/test-orders', 'DELETE', __( 'Shop managers', 'sourcesay' ), __( 'Deletes every test order and its answer.', 'sourcesay' ) ],
		] );
		const embed = table( [ __( 'Name', 'sourcesay' ), __( 'Type', 'sourcesay' ), __( 'Details', 'sourcesay' ) ], [
			[ '[sourcesay]', __( 'Shortcode', 'sourcesay' ), __( 'Shows the survey on a custom thank-you page. Optional order_id attribute, for example [sourcesay order_id="123"]. Prints nothing when no order or a wrong order key is found.', 'sourcesay' ) ],
			[ 'sourcesay/survey', __( 'Block', 'sourcesay' ), __( 'Dynamic block, shown in the inserter as “SourceSay survey”. Same output as the shortcode.', 'sourcesay' ) ],
			[ 'order-received, order_id, order, wcf-order, order-id', __( 'Order lookup', 'sourcesay' ), __( 'Where the order ID is read from: the WooCommerce endpoint, then these URL parameters.', 'sourcesay' ) ],
			[ 'key, order_key, wcf-key', __( 'Order key', 'sourcesay' ), __( 'URL parameters checked for the order key. It must match the order, otherwise nothing is shown.', 'sourcesay' ) ],
		] );
		const keys = table( [ __( 'Key', 'sourcesay' ), __( 'Values', 'sourcesay' ), __( 'Meaning', 'sourcesay' ) ], [
			[ 'placement', '"auto" | "manual"', __( 'auto: shown on the WooCommerce thank-you page. manual: only where the block or shortcode is placed. The survey renders once per page either way.', 'sourcesay' ) ],
			[ 'audience', '"all" | "new"', __( 'new: skip customers who had an earlier paid order (same rule as “returning” in reports).', 'sourcesay' ) ],
			[ 'allow_skip', 'true | false', __( 'Shows the skip button. A skip stores a row with answer_id "__skip" so the survey is not shown again.', 'sourcesay' ) ],
			[ 'skip_label', __( 'text, max 40', 'sourcesay' ), __( 'Skip button text. Stored as the answer label of skip rows.', 'sourcesay' ) ],
			[ '__skip', __( 'answer_id value', 'sourcesay' ), __( 'Never counted as an answer. Reports show it as totals.skipped and totals.skip_rate; the CSV shows “Skipped”; the orders filter has a “Skipped” option.', 'sourcesay' ) ],
		] );
		const settingsEx = "// Read the survey settings in your own code.\n$settings = sourcesay_get_settings();\nif ( 'manual' === $settings['placement'] ) {\n\t// Only shown where [sourcesay] or the block is placed.\n}";
		const curl = "curl -X POST '" + base + "/response' \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"order_id\":123,\"order_key\":\"wc_order_abc123\",\"answer_id\":\"instagram\"}'";
		const csv = table( [ __( 'Column', 'sourcesay' ), __( 'Meaning', 'sourcesay' ) ], [
			[ 'date', __( 'When the customer answered (store time)', 'sourcesay' ) ],
			[ 'order_id', __( 'WooCommerce order ID', 'sourcesay' ) ],
			[ 'order_number', __( 'Order number as customers see it', 'sourcesay' ) ],
			[ 'answer', __( 'The answer label they picked, or “Skipped”', 'sourcesay' ) ],
			[ 'follow_up', __( 'Follow-up text, if any', 'sourcesay' ) ],
			[ 'other', __( 'Text typed for “Other”, if any', 'sourcesay' ) ],
			[ 'order_total', __( 'Order total minus refunds', 'sourcesay' ) ],
			[ 'currency', __( 'Order currency code', 'sourcesay' ) ],
			[ 'status', __( 'Order status', 'sourcesay' ) ],
			[ 'returning', __( '“yes” if the customer had paid for an earlier order, otherwise “no”', 'sourcesay' ) ],
			[ 'woocommerce_source_type', __( 'Source type from WooCommerce order attribution', 'sourcesay' ) ],
			[ 'woocommerce_source', __( 'Source (utm_source or referrer) from WooCommerce order attribution', 'sourcesay' ) ],
		] );
		return el( 'section', { class: 'ss-card ss-dev' }, details( __( 'For developers', 'sourcesay' ), [
			el( 'p', { class: 'ss-muted', text: __( 'Hooks, REST routes and the CSV format. Code goes in a small custom plugin or your child theme’s functions.php.', 'sourcesay' ) } ),
			el( 'h3', { class: 'ss-card__sub', text: __( 'Hooks and filters', 'sourcesay' ) } ),
			hooks,
			codeBlock( ex1, 'sourcesay_should_display' ),
			codeBlock( ex2, 'sourcesay_response_saved' ),
			codeBlock( ex3, 'sourcesay_response_data' ),
			el( 'h3', { class: 'ss-card__sub', text: __( 'JavaScript hooks', 'sourcesay' ) } ),
			el( 'p', { class: 'ss-field__help', text: __( 'Filters on wp.hooks. ui holds this screen’s building blocks (el, card, toggle, textField, toast and more), so your cards match the rest of SourceSay.', 'sourcesay' ) } ),
			jsHooks,
			codeBlock( jsEx, 'sourcesay.reports.cards' ),
			el( 'h3', { class: 'ss-card__sub', text: __( 'Block and shortcode', 'sourcesay' ) } ),
			embed,
			el( 'h3', { class: 'ss-card__sub', text: __( 'Settings keys', 'sourcesay' ) } ),
			el( 'p', { class: 'ss-field__help' }, __( 'Stored in the option', 'sourcesay' ) + ' ', el( 'code', { text: 'sourcesay_settings' } ), ' ' + __( 'and returned by GET /admin/settings. These keys control placement, audience and skipping:', 'sourcesay' ) ),
			keys,
			codeBlock( settingsEx, 'sourcesay_get_settings()' ),
			el( 'h3', { class: 'ss-card__sub', text: __( 'REST API', 'sourcesay' ) } ),
			el( 'p', { class: 'ss-field__help' }, __( 'Base URL:', 'sourcesay' ) + ' ', el( 'code', { text: base } ), ' ' + __( 'Admin routes need a logged-in user who can manage WooCommerce (cookie and X-WP-Nonce header, or an application password).', 'sourcesay' ) ),
			rest,
			codeBlock( curl, __( 'Save an answer with curl', 'sourcesay' ) ),
			el( 'h3', { class: 'ss-card__sub', text: __( 'CSV export columns', 'sourcesay' ) } ),
			el( 'p', { class: 'ss-field__help', text: __( 'Export from Reports. Test orders are left out, and cells that start with = + - @ are escaped so spreadsheets do not run them as formulas.', 'sourcesay' ) } ),
			csv,
			applyHook( 'sourcesay.developer.items', [], { ui: UI, restBase: base } ),
		], false, 'gear', 'dev' ) );
	}

	/** Round axis: a clean step (1, 2, 2.5, 5 x 10^n) and a max that is a whole number of steps, from zero. */
	function niceScale( v, integer ) {
		if ( v <= 0 ) {
			return integer ? { max: 4, step: 1 } : { max: 100, step: 25 };
		}
		const raw = v / 4;
		const p = Math.pow( 10, Math.floor( Math.log10( raw ) ) );
		const m = raw / p;
		let step = p * 10;
		if ( m <= 1 ) {
			step = p;
		} else if ( m <= 2 ) {
			step = p * 2;
		} else if ( m <= 2.5 ) {
			step = p * 2.5;
		} else if ( m <= 5 ) {
			step = p * 5;
		}
		if ( integer ) {
			step = Math.max( 1, Math.ceil( step ) );
		}
		return { max: Math.ceil( v / step - 1e-9 ) * step, step };
	}

	function trendCard( rep ) {
		const rows = rep.trend || [];
		const box = el( 'div', { class: 'ss-chart' } );
		const metricSeg = seg( __( 'Chart metric', 'sourcesay' ), [ [ 'responses', __( 'Answers', 'sourcesay' ) ], [ 'revenue', __( 'Revenue', 'sourcesay' ) ] ], S.chartMetric, ( m ) => {
			S.chartMetric = m;
			metricSeg.querySelectorAll( 'button' ).forEach( ( b, i ) => b.setAttribute( 'aria-pressed', String( ( i === 0 ? 'responses' : 'revenue' ) === m ) ) );
			drawChart( box, rows, true );
		}, true );
		const table = el( 'table', { class: 'ss-sr' },
			el( 'caption', { text: __( 'Answers and revenue per day', 'sourcesay' ) } ),
			el( 'thead', null, el( 'tr', null, el( 'th', { scope: 'col', text: __( 'Date', 'sourcesay' ) } ), el( 'th', { scope: 'col', text: __( 'Answers', 'sourcesay' ) } ), el( 'th', { scope: 'col', text: __( 'Revenue', 'sourcesay' ) } ) ) ),
			el( 'tbody', null, rows.map( ( r ) => el( 'tr', null, el( 'th', { scope: 'row', text: fmtDay( r.date, true ) } ), el( 'td', { text: fmtNum( r.responses ) } ), el( 'td', { text: fmtMoney( r.revenue ) } ) ) ) )
		);
		const c = card( { icon: 'calendar', tone: 'green', title: __( 'Daily trend', 'sourcesay' ), desc: __( 'Answers or revenue from answered orders, per day.', 'sourcesay' ), actions: metricSeg }, box, table );
		requestAnimationFrame( () => drawChart( box, rows, true ) );
		if ( window.ResizeObserver ) {
			let w = 0;
			new ResizeObserver( () => {
				if ( box.clientWidth && Math.abs( box.clientWidth - w ) > 4 ) {
					const first = ! w;
					w = box.clientWidth;
					if ( ! first ) {
						drawChart( box, rows, false );
					}
				}
			} ).observe( box );
		}
		return c;
	}

	/** Column with a 4px rounded data end and a square foot on the baseline. */
	function barPath( x, y, w, h ) {
		const r = Math.min( 4, w / 2, h );
		return 'M' + x + ',' + ( y + h ) + 'V' + ( y + r ) + 'Q' + x + ',' + y + ' ' + ( x + r ) + ',' + y + 'H' + ( x + w - r ) + 'Q' + ( x + w ) + ',' + y + ' ' + ( x + w ) + ',' + ( y + r ) + 'V' + ( y + h ) + 'Z';
	}

	function drawChart( box, rows, animate ) {
		box.textContent = '';
		box.classList.toggle( 'is-static', ! animate );
		const metric = S.chartMetric;
		const isRev = metric === 'revenue';
		const W = Math.max( 260, box.clientWidth || 640 );
		const H = 260;
		const n = Math.max( 1, rows.length );
		const vals = rows.map( ( r ) => Math.max( 0, +r[ metric ] || 0 ) );
		const peak = Math.max( 0, ...vals );
		const scale = niceScale( peak, ! isRev );
		const max = scale.max;
		const fmt = isRev ? fmtMoneyShort : fmtNum;
		const ticks = [];
		for ( let v = 0; v <= max + 1e-9; v += scale.step ) {
			ticks.push( v );
		}
		const L = 10 + Math.max( ...ticks.map( ( v ) => fmt( v ).length ) ) * 6.6;
		const Rp = 4;
		const T = 24;
		const B = 30;
		const iw = W - L - Rp;
		const ih = H - T - B;
		const titleId = uid( 'ct' );
		const descId = uid( 'cd' );
		const total = vals.reduce( ( a, v ) => a + v, 0 );
		const y0 = T + ih;
		const svg = svgEl( 'svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', tabindex: '0', 'aria-labelledby': titleId + ' ' + descId } );
		svg.appendChild( svgEl( 'title', { id: titleId }, isRev ? __( 'Revenue per day', 'sourcesay' ) : __( 'Answers per day', 'sourcesay' ) ) );
		svg.appendChild( svgEl( 'desc', { id: descId }, sprintf( /* translators: 1: total, 2: number of days. */ __( '%1$s in total over %2$s days. Use the left and right arrow keys to read each day. The same data is in the table below the chart.', 'sourcesay' ), isRev ? fmtMoney( total ) : fmtNum( total ), String( rows.length ) ) ) );
		ticks.forEach( ( v ) => {
			const y = Math.round( y0 - ( v / max ) * ih ) + 0.5;
			if ( v > 0 ) {
				svg.appendChild( svgEl( 'line', { class: 'ss-chart__grid', x1: L, x2: W - Rp, y1: y, y2: y } ) );
			}
			svg.appendChild( svgEl( 'text', { class: 'ss-chart__axis', x: L - 10, y: y + 4, 'text-anchor': 'end' }, fmt( v ) ) );
		} );
		const step = iw / n;
		const bw = Math.max( 2, Math.min( 24, step * 0.64 ) );
		const band = svgEl( 'rect', { class: 'ss-chart__band', x: 0, y: T - 8, width: Math.max( bw + 8, step - 2 ), height: ih + 8, rx: 6 } );
		svg.appendChild( band );
		const bars = vals.map( ( v, i ) => {
			const h = v > 0 ? Math.max( 2, ( v / max ) * ih ) : 0;
			const p = svgEl( 'path', { class: 'ss-chart__bar' + ( isRev ? ' ss-chart__bar--revenue' : '' ), d: h ? barPath( L + i * step + ( step - bw ) / 2, y0 - h, bw, h ) : '', style: '--ss-i:' + Math.min( i, 60 ) } );
			p.dataset.top = y0 - h;
			svg.appendChild( p );
			return p;
		} );
		svg.appendChild( svgEl( 'line', { class: 'ss-chart__base', x1: L, x2: W - Rp, y1: y0 + 0.5, y2: y0 + 0.5 } ) );
		const peakAt = vals.indexOf( peak );
		if ( peak > 0 ) {
			// One direct label: the best day. Every other value is on the axis, in the tooltip and in the table.
			const px = Math.min( Math.max( L + peakAt * step + step / 2, L + 18 ), W - Rp - 18 );
			svg.appendChild( svgEl( 'text', { class: 'ss-chart__peak', x: px, y: +bars[ peakAt ].dataset.top - 7, 'text-anchor': 'middle' }, fmt( peak ) ) );
		} else {
			svg.appendChild( svgEl( 'text', { class: 'ss-chart__empty', x: L + iw / 2, y: T + ih / 2, 'text-anchor': 'middle' }, isRev ? __( 'No revenue from answered orders in this range yet.', 'sourcesay' ) : __( 'No answers in this range yet.', 'sourcesay' ) ) );
		}
		const labels = n === 1 ? 1 : Math.min( n, Math.max( 2, Math.floor( iw / 72 ) ) );
		const seen = new Set();
		for ( let k = 0; k < labels; k++ ) {
			const i = labels === 1 ? 0 : Math.round( ( k * ( n - 1 ) ) / ( labels - 1 ) );
			if ( seen.has( i ) || ! rows[ i ] ) {
				continue;
			}
			seen.add( i );
			const cx = L + i * step + step / 2;
			let anchor = 'middle';
			let x = cx;
			if ( labels > 1 && k === 0 && cx - 24 < L ) {
				anchor = 'start';
				x = L + i * step + ( step - bw ) / 2;
			} else if ( labels > 1 && k === labels - 1 && cx + 24 > W - Rp ) {
				anchor = 'end';
				x = L + i * step + ( step + bw ) / 2;
			}
			svg.appendChild( svgEl( 'text', { class: 'ss-chart__axis', x, y: H - 8, 'text-anchor': anchor }, fmtDay( rows[ i ].date ) ) );
		}
		box.appendChild( svg );

		const tip = el( 'div', { class: 'ss-chart__tip', hidden: true, 'aria-hidden': 'true' } );
		box.appendChild( tip );
		let active = -1;
		const show = ( i ) => {
			if ( active >= 0 && bars[ active ] ) {
				bars[ active ].classList.remove( 'is-active' );
			}
			active = i;
			if ( i < 0 || ! rows[ i ] ) {
				tip.hidden = true;
				band.classList.remove( 'is-active' );
				return;
			}
			bars[ i ].classList.add( 'is-active' );
			band.setAttribute( 'x', L + i * step + ( step - +band.getAttribute( 'width' ) ) / 2 );
			band.classList.add( 'is-active' );
			const r = rows[ i ];
			tip.textContent = '';
			add( tip, [
				el( 'strong', { text: fmtDay( r.date, true ) } ),
				el( 'span', { class: 'ss-chart__tip-row' }, el( 'span', { class: 'ss-swatch ss-swatch--responses' } ), sprintf( /* translators: %s: number of answers */ _n( '%s answer', '%s answers', +r.responses || 0, 'sourcesay' ), fmtNum( r.responses ) ) ),
				el( 'span', { class: 'ss-chart__tip-row' }, el( 'span', { class: 'ss-swatch' } ), sprintf( /* translators: %s: revenue amount */ __( '%s revenue', 'sourcesay' ), fmtMoney( r.revenue ) ) ),
			] );
			tip.hidden = false;
			const k = box.clientWidth / W;
			const half = tip.offsetWidth / 2;
			const cx = ( L + i * step + step / 2 ) * k;
			tip.style.left = Math.min( Math.max( cx, half ), box.clientWidth - half ) + 'px';
			tip.style.top = ( ( Math.min( +bars[ i ].dataset.top, y0 ) - ( i === peakAt ? 16 : 0 ) ) * k ) + 'px';
			announce( tip.textContent );
		};
		const fromPointer = ( e ) => {
			const rect = svg.getBoundingClientRect();
			const x = ( ( e.clientX - rect.left ) / rect.width ) * W;
			const i = Math.floor( ( x - L ) / step );
			if ( i !== active ) {
				show( i >= 0 && i < n ? i : -1 );
			}
		};
		svg.addEventListener( 'pointermove', fromPointer );
		svg.addEventListener( 'pointerdown', fromPointer );
		svg.addEventListener( 'pointerleave', () => show( -1 ) );
		svg.addEventListener( 'blur', () => show( -1 ) );
		svg.addEventListener( 'keydown', ( e ) => {
			let i = active;
			if ( e.key === 'ArrowRight' ) {
				i = Math.min( n - 1, active + 1 );
			} else if ( e.key === 'ArrowLeft' ) {
				i = active < 0 ? n - 1 : Math.max( 0, active - 1 );
			} else if ( e.key === 'Home' ) {
				i = 0;
			} else if ( e.key === 'End' ) {
				i = n - 1;
			} else if ( e.key === 'Escape' ) {
				i = -1;
			} else {
				return;
			}
			e.preventDefault();
			show( i );
		} );
	}

	function nvrCard( rep ) {
		const v = rep.new_vs_returning || { new: {}, returning: {} };
		const nw = +( v.new && v.new.responses ) || 0;
		const rt = +( v.returning && v.returning.responses ) || 0;
		const all = nw + rt || 1;
		const row = ( cls, icon, name, d, count ) => el( 'div', { class: 'ss-split-row' },
			el( 'span', { class: 'ss-split-row__icon' + cls }, ico( icon ) ),
			el( 'span', null,
				el( 'span', { class: 'ss-split-row__name', text: name } ),
				el( 'span', { class: 'ss-split-row__meta', style: 'display:block', text: sprintf( /* translators: %s: revenue amount */ __( '%s revenue', 'sourcesay' ), fmtMoney( ( d && d.revenue ) || 0 ) ) } )
			),
			el( 'span', { class: 'ss-split-row__value' }, fmtPct( count / all ), el( 'small', { text: sprintf( /* translators: %s: number of answers */ _n( '%s answer', '%s answers', count, 'sourcesay' ), fmtNum( count ) ) } ) )
		);
		return card( { icon: 'user-plus', tone: 'green', title: __( 'New vs returning', 'sourcesay' ), desc: __( 'Returning means the customer had paid for an earlier order.', 'sourcesay' ) },
			el( 'div', { class: 'ss-split', role: 'img', 'aria-label': sprintf( /* translators: 1: share new, 2: share returning */ __( 'New customers %1$s, returning customers %2$s of answers', 'sourcesay' ), fmtPct( nw / all ), fmtPct( rt / all ) ) },
				el( 'span', { class: 'ss-split__part', style: 'width:' + ( ( nw / all ) * 100 ).toFixed( 1 ) + '%' } ),
				el( 'span', { class: 'ss-split__part ss-split__part--ret', style: 'width:' + ( ( rt / all ) * 100 ).toFixed( 1 ) + '%' } )
			),
			el( 'div', { class: 'ss-split-list' },
				row( '', 'user-plus', __( 'New customers', 'sourcesay' ), v.new, nw ),
				row( ' ss-split-row__icon--ret', 'refresh', __( 'Returning customers', 'sourcesay' ), v.returning, rt )
			)
		);
	}

	function toldCard( rep ) {
		const fu = rep.followups || {};
		const groups = Object.keys( fu ).filter( ( k ) => ( fu[ k ] || [] ).length );
		const left = groups.length ? groups.map( ( id ) => {
			const ch = channelLabel( id );
			const list = fu[ id ];
			const max = Math.max( 1, ...list.map( ( a ) => +a.count || 0 ) );
			return el( 'div', { class: 'ss-told__group' },
				el( 'h4', { class: 'ss-card__sub' }, el( 'span', { class: 'ss-chan__icon' }, ico( ch.icon || 'tag' ) ), ch.label ),
				el( 'ul', { class: 'ss-answers' }, list.map( ( a, i ) => el( 'li', { class: 'ss-answer' },
					el( 'span', { class: 'ss-answer__bar', style: 'width:' + ( ( a.count / max ) * 100 ).toFixed( 1 ) + '%;--ss-i:' + i } ),
					el( 'span', { class: 'ss-answer__text', text: a.text } ),
					el( 'span', { class: 'ss-answer__count', text: fmtNum( a.count ) } )
				) ) )
			);
		} ) : el( 'div', { class: 'ss-empty ss-empty--compact' },
			el( 'p', { class: 'ss-empty__text', text: __( 'No follow-up answers in this range. Add a follow-up question to an answer, like “Which podcast?”, in the Survey tab.', 'sourcesay' ) } ),
			el( 'a', { class: 'ss-btn ss-btn--tertiary ss-btn--sm', href: '#survey', text: __( 'Edit the survey', 'sourcesay' ) } )
		);
		const others = rep.other || [];
		const right = others.length ? el( 'ul', { class: 'ss-quotes' }, others.map( ( o ) => el( 'li', { class: 'ss-quote' },
			el( 'span', { class: 'ss-quote__text', text: o.text } ),
			el( 'span', { class: 'ss-quote__date', text: fmtDay( o.date ) } )
		) ) ) : el( 'div', { class: 'ss-empty ss-empty--compact' }, el( 'p', { class: 'ss-empty__text', text: __( 'No “Other” answers in this range.', 'sourcesay' ) } ) );
		return card( { icon: 'chat', tone: 'orange', title: __( 'What they told us', 'sourcesay' ), desc: __( 'Top follow-up answers per channel and the latest “Other” replies, in the customers’ own words.', 'sourcesay' ) },
			el( 'div', { class: 'ss-told' },
				el( 'div', null, el( 'h3', { class: 'ss-card__sub', text: __( 'Follow-up answers', 'sourcesay' ) } ), left ),
				el( 'div', null, el( 'h3', { class: 'ss-card__sub', text: __( 'Latest “Other” answers', 'sourcesay' ) } ), right )
			)
		);
	}

	/* ------------------------------------------------------------------ */
	/* Settings loading + saving                                          */
	/* ------------------------------------------------------------------ */
	function loadSettings() {
		S.settingsState = 'loading';
		if ( DRAFT_TABS.includes( S.tab ) ) {
			render();
		}
		api( '/admin/settings' ).then( ( r ) => {
			S.saved = r.settings;
			S.presets = r.presets || {};
			S.icons = ( r.icons && r.icons.length ) ? r.icons : ICON_KEYS;
			S.iconGroups = ( r.icon_groups && typeof r.icon_groups === 'object' && Object.keys( r.icon_groups ).length ) ? r.icon_groups : ICON_GROUPS;
			S.draft = withKeys( r.settings );
			S.accentCustom = !! r.settings.accent;
			S.settingsState = 'ready';
			if ( DRAFT_TABS.includes( S.tab ) || S.tab === 'reports' ) {
				render();
			}
		} ).catch( ( err ) => {
			S.settingsState = 'error';
			S.settingsErr = err;
			if ( DRAFT_TABS.includes( S.tab ) ) {
				render();
			}
		} );
	}

	function save() {
		const errs = validate();
		if ( Object.keys( errs ).length ) {
			S.showErrors = true;
			updateErrors();
			const n = Object.keys( errs ).length;
			const first = mount.querySelector( '[aria-invalid="true"]' );
			toast( 'error', sprintf( /* translators: %d: number of fields */ _n( 'Fix %d field before saving.', 'Fix %d fields before saving.', n, 'sourcesay' ), n ) );
			if ( first ) {
				first.focus();
			} else if ( S.tab !== 'survey' ) {
				S.allowNav = true;
				location.hash = 'survey';
			}
			return Promise.resolve( false );
		}
		S.saving = true;
		updateSavebar();
		return api( '/admin/settings', { method: 'POST', data: { settings: payload() } } ).then( ( r ) => {
			const keys = S.draft.options.map( ( o ) => o._k );
			S.saved = r.settings;
			S.draft = withKeys( r.settings );
			S.draft.options.forEach( ( o, i ) => {
				if ( keys[ i ] ) {
					o._k = keys[ i ];
				}
			} );
			S.saving = false;
			S.showErrors = false;
			S.touched.clear();
			toast( 'success', __( 'Changes saved', 'sourcesay' ) );
			if ( DRAFT_TABS.includes( S.tab ) ) {
				render();
				if ( R.barStatus ) {
					R.barStatus.focus( { preventScroll: true } );
				}
			}
			return true;
		} ).catch( ( err ) => {
			S.saving = false;
			updateSavebar();
			toast( 'error', sprintf( /* translators: %s: error message */ __( 'Changes not saved. %s', 'sourcesay' ), errText( err ) ) );
			return false;
		} );
	}

	function saveBar() {
		R.barStatus = el( 'span', { class: 'ss-savebar__status', tabindex: '-1', role: 'status' }, el( 'span', { class: 'ss-dot' } ), el( 'span' ) );
		R.barDiscard = el( 'button', { type: 'button', class: 'ss-btn ss-btn--neutral', text: __( 'Discard', 'sourcesay' ), on: { click: () => {
			S.draft = withKeys( S.saved );
			S.accentCustom = !! S.saved.accent;
			S.showErrors = false;
			S.touched.clear();
			render();
			toast( 'info', __( 'Changes discarded', 'sourcesay' ) );
		} } } );
		R.barSave = el( 'button', { type: 'button', class: 'ss-btn ss-btn--primary', on: { click: () => save() } }, ico( 'check' ), __( 'Save changes', 'sourcesay' ) );
		const bar = el( 'div', { class: 'ss-savebar' }, R.barStatus, R.barDiscard, R.barSave );
		updateSavebar();
		return bar;
	}

	function updateSavebar() {
		if ( ! R.barSave ) {
			return;
		}
		const dirty = isDirty();
		R.barSave.disabled = ! dirty || S.saving;
		R.barSave.classList.toggle( 'is-busy', S.saving );
		R.barDiscard.disabled = ! dirty || S.saving;
		const errs = S.showErrors ? Object.keys( validate() ).length : 0;
		let text = __( 'All changes saved', 'sourcesay' );
		if ( S.saving ) {
			text = __( 'Saving…', 'sourcesay' );
		} else if ( errs ) {
			text = sprintf( /* translators: %d: number of fields */ _n( '%d field needs attention', '%d fields need attention', errs, 'sourcesay' ), errs );
		} else if ( dirty ) {
			text = __( 'Unsaved changes', 'sourcesay' );
		}
		R.barStatus.className = 'ss-savebar__status' + ( errs ? ' is-error' : ( dirty ? ' is-dirty' : '' ) );
		R.barStatus.lastChild.textContent = text;
	}

	function settingsGate( wrap, title, desc ) {
		wrap.appendChild( pageHead( title, desc ) );
		if ( S.settingsState === 'error' ) {
			wrap.appendChild( errorCard( S.settingsErr, loadSettings ) );
			return false;
		}
		if ( S.settingsState !== 'ready' ) {
			wrap.appendChild( el( 'div', { class: 'ss-builder', 'aria-busy': 'true' },
				el( 'p', { class: 'ss-sr', text: __( 'Loading settings…', 'sourcesay' ) } ),
				el( 'div', { class: 'ss-stack', 'aria-hidden': 'true' }, [ 1, 2 ].map( () => el( 'div', { class: 'ss-card' }, el( 'div', { class: 'ss-card__body' }, el( 'span', { class: 'ss-skel ss-skel--title' } ), [ 1, 2, 3, 4 ].map( () => el( 'span', { class: 'ss-skel ss-skel--row' } ) ) ) ) ) ),
				el( 'div', { class: 'ss-card', 'aria-hidden': 'true' }, el( 'div', { class: 'ss-card__body' }, el( 'span', { class: 'ss-skel ss-skel--title' } ), el( 'span', { class: 'ss-skel ss-skel--block' } ) ) )
			) );
			return false;
		}
		return true;
	}

	/* ------------------------------------------------------------------ */
	/* Survey builder                                                     */
	/* ------------------------------------------------------------------ */
	function renderSurvey( wrap ) {
		if ( ! settingsGate( wrap, __( 'Survey', 'sourcesay' ), __( 'Choose what customers are asked on the order confirmation page. The preview updates as you type.', 'sourcesay' ) ) ) {
			return;
		}
		const d = S.draft;

		const presetKeys = Object.keys( S.presets || {} );
		const presetSel = el( 'select', { class: 'ss-select', id: 'ss-preset', on: { change: () => {
			S.presetPick = presetSel.value;
			applyBtn.disabled = ! S.presetPick;
			confirmBox.hidden = true;
		} } },
		el( 'option', { value: '', text: __( 'Choose a preset…', 'sourcesay' ) } ),
		presetKeys.map( ( k ) => el( 'option', { value: k, text: PRESET_LABELS[ k ] || ( k.charAt( 0 ).toUpperCase() + k.slice( 1 ) ), selected: k === S.presetPick } ) )
		);
		const applyBtn = el( 'button', { type: 'button', class: 'ss-btn ss-btn--neutral', disabled: ! S.presetPick, text: __( 'Apply preset', 'sourcesay' ), 'aria-expanded': 'false', 'aria-controls': 'ss-preset-confirm', on: { click: () => {
			confirmText.textContent = sprintf( /* translators: 1: preset name, 2: number of answers */ _n( 'Replace your %2$s answer with the “%1$s” preset?', 'Replace your %2$s answers with the “%1$s” preset?', d.options.length, 'sourcesay' ), PRESET_LABELS[ S.presetPick ] || S.presetPick, d.options.length );
			confirmBox.hidden = false;
			applyBtn.setAttribute( 'aria-expanded', 'true' );
			confirmBox.querySelector( '.ss-btn--primary' ).focus();
		} } } );
		const confirmText = el( 'strong' );
		const confirmBox = el( 'div', { class: 'ss-confirm', id: 'ss-preset-confirm', role: 'alertdialog', 'aria-labelledby': 'ss-preset-q', hidden: true },
			el( 'div', { id: 'ss-preset-q' }, confirmText, el( 'p', { class: 'ss-field__help', text: __( 'Your current answers, icons and follow-up questions are replaced. Nothing changes for customers until you save.', 'sourcesay' ) } ) ),
			el( 'div', { class: 'ss-confirm__actions' },
				el( 'button', { type: 'button', class: 'ss-btn ss-btn--primary ss-btn--sm', text: __( 'Replace answers', 'sourcesay' ), on: { click: () => {
					const preset = S.presets[ S.presetPick ];
					if ( preset ) {
						d.options = withKeys( { options: preset } ).options;
						renderOpts();
						changed();
						toast( 'success', __( 'Preset applied. Save to show it to customers.', 'sourcesay' ) );
					}
					confirmBox.hidden = true;
					applyBtn.setAttribute( 'aria-expanded', 'false' );
					presetSel.focus();
				} } } ),
				el( 'button', { type: 'button', class: 'ss-btn ss-btn--tertiary ss-btn--sm', text: __( 'Cancel', 'sourcesay' ), on: { click: () => {
					confirmBox.hidden = true;
					applyBtn.setAttribute( 'aria-expanded', 'false' );
					applyBtn.focus();
				} } } )
			)
		);

		const qCard = card( { icon: 'chat', title: __( 'Question', 'sourcesay' ) },
			el( 'div', { class: 'ss-stack' },
				toggle( { label: __( 'Show the survey to customers after checkout', 'sourcesay' ), help: __( 'On: customers see it on the order confirmation page and can skip it. Off: only test orders show it.', 'sourcesay' ), checked: d.enabled, onChange: ( v ) => {
					d.enabled = v;
					changed();
				} } ),
				textField( { label: __( 'Question text', 'sourcesay' ), value: d.question, max: 160, errKey: 'question', onInput: ( v ) => {
					d.question = v;
					changed();
				} } ),
				skipControls( d ),
				presetKeys.length ? el( 'div', null,
					el( 'div', { class: 'ss-inline' },
						el( 'div', { class: 'ss-field' }, el( 'label', { class: 'ss-field__label', for: 'ss-preset', text: __( 'Start from a preset', 'sourcesay' ) } ), presetSel ),
						applyBtn
					),
					confirmBox
				) : null
			)
		);

		R.opts = el( 'ul', { class: 'ss-opts', 'aria-label': __( 'Answers', 'sourcesay' ) } );
		R.addBtn = el( 'button', { type: 'button', class: 'ss-btn ss-btn--secondary', on: { click: addOption } }, ico( 'plus' ), __( 'Add answer', 'sourcesay' ) );
		R.optCount = el( 'span', { class: 'ss-field__help' } );
		const optsCard = card( { icon: 'list', tone: 'green', title: __( 'Answers', 'sourcesay' ), desc: __( 'Drag the handle or use the arrow buttons to reorder. Turn an answer off to hide it without deleting it.', 'sourcesay' ) },
			R.opts,
			errBox( 'options' ),
			el( 'div', { class: 'ss-opts__foot' }, R.addBtn, R.optCount )
		);

		const otherFields = el( 'div', { class: 'ss-row2', hidden: ! d.other.enabled },
			textField( { label: __( 'Label', 'sourcesay' ), value: d.other.label, max: 60, errKey: 'other', onInput: ( v ) => {
				d.other.label = v;
				changed();
			} } ),
			textField( { label: __( 'Text box prompt', 'sourcesay' ), value: d.other.placeholder, max: 80, onInput: ( v ) => {
				d.other.placeholder = v;
				changed();
			} } )
		);
		const otherCard = card( { icon: 'question', tone: 'orange', title: __( 'Other answer', 'sourcesay' ) },
			el( 'div', { class: 'ss-stack' },
				toggle( { label: __( 'Offer an “Other” answer with a text box', 'sourcesay' ), help: __( 'Always shown last, so customers can name a channel you did not list.', 'sourcesay' ), checked: d.other.enabled, onChange: ( v ) => {
					d.other.enabled = v;
					otherFields.hidden = ! v;
					changed();
				} } ),
				otherFields
			)
		);

		const hexInput = el( 'input', { type: 'text', class: 'ss-input', id: 'ss-accent-hex', value: d.accent || '', maxlength: 7, spellcheck: 'false', 'aria-label': __( 'Hex colour', 'sourcesay' ) } );
		const colourInput = el( 'input', { type: 'color', id: 'ss-accent-picker', value: /^#[0-9a-f]{6}$/i.test( d.accent ) ? d.accent : '#4f5bff', 'aria-label': __( 'Pick a colour', 'sourcesay' ) } );
		const accentErr = errBox( 'accent' );
		hexInput.setAttribute( 'aria-describedby', accentErr.id );
		colourInput.addEventListener( 'input', () => {
			d.accent = colourInput.value;
			hexInput.value = colourInput.value;
			changed();
		} );
		hexInput.addEventListener( 'input', () => {
			let v = hexInput.value.trim();
			if ( v && v[ 0 ] !== '#' ) {
				v = '#' + v;
			}
			d.accent = v.toLowerCase();
			if ( /^#[0-9a-f]{6}$/i.test( v ) ) {
				colourInput.value = v;
			}
			changed();
		} );
		hexInput.addEventListener( 'blur', () => {
			S.touched.add( 'accent' );
			updateErrors();
		} );
		const colourRow = el( 'div', { class: 'ss-colour', hidden: ! S.accentCustom }, colourInput, hexInput );
		const accentName = uid( 'acc' );
		const accentRadio = ( val, label ) => el( 'label', { class: 'ss-check', style: 'display:flex;align-items:center;gap:8px;min-height:44px;cursor:pointer' },
			el( 'input', { type: 'radio', name: accentName, value: val, checked: ( val === 'custom' ) === S.accentCustom, on: { change: () => {
				S.accentCustom = val === 'custom';
				colourRow.hidden = ! S.accentCustom;
				d.accent = S.accentCustom ? ( /^#[0-9a-f]{6}$/i.test( hexInput.value ) ? hexInput.value : colourInput.value ) : '';
				hexInput.value = d.accent;
				changed();
			} } } ),
			label
		);

		const layoutName = uid( 'lay' );
		const choice = ( val, name, art ) => el( 'label', { class: 'ss-choice' },
			el( 'input', { type: 'radio', name: layoutName, value: val, checked: d.layout === val, on: { change: () => {
				d.layout = val;
				changed();
			} } } ),
			el( 'span', { class: 'ss-choice__art' + ( val === 'list' ? ' ss-choice__art--list' : '' ), 'aria-hidden': 'true' }, art ),
			el( 'span', { class: 'ss-choice__name', text: name } )
		);
		const pills = [ 46, 30, 52, 38, 34 ].map( ( w ) => el( 'i', { style: 'width:' + w + 'px' } ) );
		const lines = [ 1, 2, 3 ].map( () => el( 'i' ) );

		const lookCard = card( { icon: 'palette', tone: 'yellow', title: __( 'Look and messages', 'sourcesay' ) },
			el( 'div', { class: 'ss-stack' },
				toggle( { label: __( 'Shuffle the answers for each order', 'sourcesay' ), help: __( 'Prevents the first answer from being picked more often just because it is first. “Other” stays last.', 'sourcesay' ), checked: d.shuffle, onChange: ( v ) => {
					d.shuffle = v;
					changed();
				} } ),
				el( 'fieldset', { class: 'ss-choices' },
					el( 'legend', { class: 'ss-field__label', text: __( 'Layout', 'sourcesay' ) } ),
					choice( 'buttons', __( 'Buttons', 'sourcesay' ), pills ),
					choice( 'list', __( 'List', 'sourcesay' ), lines )
				),
				el( 'fieldset', { class: 'ss-field', style: 'border:0;margin:0;padding:0' },
					el( 'legend', { class: 'ss-field__label', text: __( 'Accent colour', 'sourcesay' ) } ),
					accentRadio( 'inherit', __( 'Match my theme', 'sourcesay' ) ),
					accentRadio( 'custom', __( 'Custom colour', 'sourcesay' ) ),
					colourRow,
					accentErr
				),
				textField( { label: __( 'Thank-you message', 'sourcesay' ), value: d.thank_you, max: 120, errKey: 'thank_you', help: __( 'Shown after the customer answers.', 'sourcesay' ), onInput: ( v ) => {
					d.thank_you = v;
					changed();
				} } )
			)
		);

		R.preview = el( 'div' );
		const widthSeg = seg( __( 'Preview width', 'sourcesay' ), [ [ false, __( 'Desktop', 'sourcesay' ) ], [ true, __( 'Mobile', 'sourcesay' ) ] ], S.previewMobile, ( m ) => {
			S.previewMobile = m;
			widthSeg.querySelectorAll( 'button' ).forEach( ( b, i ) => b.setAttribute( 'aria-pressed', String( ( i === 1 ) === m ) ) );
			renderPreview();
		}, true );
		const previewCard = card( { icon: 'eye', tone: 'cream', title: __( 'Preview', 'sourcesay' ), desc: __( 'Try it: click an answer. Your theme sets the final font and colours.', 'sourcesay' ), actions: widthSeg }, R.preview );

		R.i18nNote = el( 'div', { class: 'ss-i18n-slot' } );
		fillI18nNote();
		wrap.appendChild( R.i18nNote );
		wrap.appendChild( el( 'div', { class: 'ss-builder' },
			el( 'div', { class: 'ss-stack' }, applyHook( 'sourcesay.survey.cards', [ qCard, optsCard, otherCard, placementCard( d ), audienceCard( d ), lookCard ], { draft: d, changed, ui: UI } ) ),
			el( 'div', { class: 'ss-builder__side' }, previewCard )
		) );
		wrap.appendChild( saveBar() );
		renderOpts();
		renderPreview();
		updateErrors();
	}

	/* ---------- Survey tab: skip, placement, audience, translation ---------- */
	function skipControls( d ) {
		const labelField = textField( { label: __( 'Skip button text', 'sourcesay' ), value: d.skip_label, max: 40, errKey: 'skip_label', help: __( 'Short and friendly works best, for example “Prefer not to say” or “Skip”.', 'sourcesay' ), onInput: ( v ) => {
			d.skip_label = v;
			changed();
		} } );
		labelField.hidden = ! d.allow_skip;
		return el( 'div', { class: 'ss-stack ss-stack--tight' },
			toggle( { label: __( 'Show a “Prefer not to say” button', 'sourcesay' ), help: __( 'A small, quiet link under the answers. Customers who press it are not asked again for that order. Skips are counted on their own and never as an answer, so your channel numbers stay accurate.', 'sourcesay' ), checked: d.allow_skip, onChange: ( v ) => {
				d.allow_skip = v;
				labelField.hidden = ! v;
				changed();
			} } ),
			labelField
		);
	}

	function copyRow( label, value, what ) {
		return el( 'div', { class: 'ss-copyrow' },
			el( 'span', { class: 'ss-copyrow__label', text: label } ),
			el( 'code', { class: 'ss-copyrow__value', text: value } ),
			el( 'button', { type: 'button', class: 'ss-btn ss-btn--secondary ss-btn--sm', 'aria-label': sprintf( /* translators: %s: what is copied, e.g. the shortcode */ __( 'Copy %s', 'sourcesay' ), what ), on: { click: () => copyText( value ) } }, __( 'Copy', 'sourcesay' ) )
		);
	}

	function placementCard( d ) {
		const name = uid( 'place' );
		const position = selectField( { label: __( 'Position on the confirmation page', 'sourcesay' ), value: d.position, options: [ [ 'after', __( 'After the order details', 'sourcesay' ) ], [ 'before', __( 'Before the order details', 'sourcesay' ) ] ], onChange: ( v ) => {
			d.position = v;
			changed();
		} } );
		position.hidden = d.placement === 'manual';
		const manualNote = el( 'div', { class: 'ss-notice', hidden: d.placement !== 'manual' }, ico( 'info' ), el( 'span', { text: __( 'The survey only appears where you add it. Until you add it to your thank-you page, customers do not see it.', 'sourcesay' ) } ) );
		const pick = ( val ) => {
			d.placement = val;
			position.hidden = val === 'manual';
			manualNote.hidden = val !== 'manual';
			changed();
		};
		const option = ( val, title, text, icon ) => el( 'label', { class: 'ss-choice ss-choice--opt' },
			el( 'input', { type: 'radio', name, value: val, checked: ( d.placement || 'auto' ) === val, on: { change: () => pick( val ) } } ),
			el( 'span', { class: 'ss-choice__icon', 'aria-hidden': 'true' }, ico( icon ) ),
			el( 'span', { class: 'ss-choice__name', text: title } ),
			el( 'span', { class: 'ss-field__help', text } )
		);
		const builders = details( __( 'Using FunnelKit, CartFlows, Elementor or Bricks thank-you pages?', 'sourcesay' ), [
			el( 'p', { class: 'ss-field__help ss-builders__text', text: __( 'Open your custom thank-you page in its editor and add the SourceSay survey block, or paste [sourcesay] into a Shortcode element (Elementor, Bricks) or a text block (FunnelKit, CartFlows).', 'sourcesay' ) } ),
			el( 'p', { class: 'ss-field__help ss-builders__text', text: __( 'The survey finds the order from the page address by itself. Then choose “Only where I add the SourceSay block or shortcode” above.', 'sourcesay' ) } ),
		] );
		return el( 'div', { 'data-jump': 'placement', class: 'ss-jump' }, card( { icon: 'map-pin', tone: 'cream', title: __( 'Where the survey appears', 'sourcesay' ), desc: __( 'Most stores keep the automatic option. Pick the second one if your thank-you page is built with a page builder or funnel plugin.', 'sourcesay' ) },
			el( 'div', { class: 'ss-stack' },
				el( 'fieldset', { class: 'ss-choices ss-choices--stack' },
					el( 'legend', { class: 'ss-sr', text: __( 'Where the survey appears', 'sourcesay' ) } ),
					option( 'auto', __( 'Automatically on the thank-you page', 'sourcesay' ), __( 'Shown on the standard WooCommerce order confirmation page, with classic or block checkout. Nothing to set up.', 'sourcesay' ), 'check' ),
					option( 'manual', __( 'Only where I add the SourceSay block or shortcode', 'sourcesay' ), __( 'For custom thank-you pages. The survey shows up only where you place it.', 'sourcesay' ), 'list' )
				),
				position,
				manualNote,
				el( 'div', { class: 'ss-copybox' },
					el( 'p', { class: 'ss-field__label', text: __( 'Add it to any page', 'sourcesay' ) } ),
					copyRow( __( 'Shortcode', 'sourcesay' ), '[sourcesay]', __( 'the shortcode', 'sourcesay' ) ),
					copyRow( __( 'Block', 'sourcesay' ), __( 'SourceSay survey', 'sourcesay' ), __( 'the block name', 'sourcesay' ) ),
					el( 'p', { class: 'ss-field__help', text: __( 'In the block editor, click + and search for the block name. The survey shows only once per page, even when the automatic option is on too.', 'sourcesay' ) } ),
					builders
				)
			)
		) );
	}

	function audienceCard( d ) {
		const name = uid( 'aud' );
		const option = ( val, title, text ) => el( 'label', { class: 'ss-choice ss-choice--opt ss-choice--plain' },
			el( 'input', { type: 'radio', name, value: val, checked: ( d.audience || 'all' ) === val, on: { change: () => {
				d.audience = val;
				changed( { preview: false } );
			} } } ),
			el( 'span', { class: 'ss-choice__name', text: title } ),
			el( 'span', { class: 'ss-field__help', text } )
		);
		return card( { icon: 'users', title: __( 'Who to ask', 'sourcesay' ) },
			el( 'div', { class: 'ss-stack' },
				el( 'fieldset', { class: 'ss-choices' },
					el( 'legend', { class: 'ss-sr', text: __( 'Who to ask', 'sourcesay' ) } ),
					option( 'all', __( 'Everyone', 'sourcesay' ), __( 'Every order gets the question until it is answered or skipped, including orders from repeat customers.', 'sourcesay' ) ),
					option( 'new', __( 'Only first-time customers', 'sourcesay' ), __( 'Customers who already paid for an earlier order are not asked again. Best when you want to know what brings in new customers.', 'sourcesay' ) )
				),
				el( 'p', { class: 'ss-field__help', text: __( 'Customers are recognised by their account, or by billing email for guest orders. Test orders always show the survey.', 'sourcesay' ) } )
			)
		);
	}

	function fillI18nNote() {
		if ( ! R.i18nNote ) {
			return;
		}
		R.i18nNote.textContent = '';
		const plugin = S.status && S.status.translation_plugin;
		const where = {
			wpml: { text: __( 'Translate these texts in WPML › String Translation (look for the “SourceSay” context).', 'sourcesay' ), href: 'admin.php?page=wpml-string-translation/menu/string-translation.php&context=SourceSay', link: __( 'Open String Translation', 'sourcesay' ) },
			polylang: { text: __( 'Translate these texts in Polylang › Translations (look for the “SourceSay” group).', 'sourcesay' ), href: 'admin.php?page=mlang_strings&group=SourceSay', link: __( 'Open Translations', 'sourcesay' ) },
		}[ plugin ];
		if ( ! where ) {
			return;
		}
		R.i18nNote.appendChild( el( 'div', { class: 'ss-notice ss-i18n' }, ico( 'globe' ), el( 'div', { class: 'ss-notice__body' },
			el( 'span', null, el( 'strong', { text: __( 'Your store is multilingual.', 'sourcesay' ) } ), ' ' + where.text + ' ' + __( 'Save here first: new or changed texts show up there after saving.', 'sourcesay' ) ),
			el( 'a', { class: 'ss-btn ss-btn--secondary ss-btn--sm', href: where.href }, ico( 'external' ), where.link )
		) ) );
	}

	function addOption() {
		const d = S.draft;
		if ( d.options.length >= MAX_OPTIONS ) {
			return;
		}
		const o = { id: '', label: '', icon: 'tag', enabled: true, followup: { enabled: false, question: '', placeholder: '' }, _k: uid( 'o' ), _new: true };
		d.options.push( o );
		renderOpts( '[data-k="' + o._k + '"] .ss-opt__label-input' );
		changed();
	}

	function moveOption( k, dir ) {
		const list = S.draft.options;
		const i = list.findIndex( ( o ) => o._k === k );
		const j = i + dir;
		if ( i < 0 || j < 0 || j >= list.length ) {
			return;
		}
		const [ o ] = list.splice( i, 1 );
		list.splice( j, 0, o );
		const sel = '[data-k="' + k + '"] .ss-move-' + ( dir < 0 ? 'up' : 'down' );
		renderOpts( sel, k );
		const btn = R.opts.querySelector( sel );
		if ( btn && btn.disabled ) {
			R.opts.querySelector( '[data-k="' + k + '"] .ss-move-' + ( dir < 0 ? 'down' : 'up' ) ).focus();
		}
		announce( sprintf( /* translators: 1: answer label, 2: position, 3: total */ __( '%1$s moved to position %2$d of %3$d', 'sourcesay' ), o.label || __( 'Answer', 'sourcesay' ), j + 1, list.length ) );
		changed();
	}

	function removeOption( k ) {
		const list = S.draft.options;
		const i = list.findIndex( ( o ) => o._k === k );
		if ( i < 0 ) {
			return;
		}
		const [ o ] = list.splice( i, 1 );
		const next = list[ i ] || list[ i - 1 ];
		renderOpts( next ? '[data-k="' + next._k + '"] .ss-opt__label-input' : null );
		if ( ! next ) {
			R.addBtn.focus();
		}
		changed();
		toast( 'info', sprintf( /* translators: %s: answer label */ __( '“%s” removed.', 'sourcesay' ), o.label || __( 'Answer', 'sourcesay' ) ), { label: __( 'Undo', 'sourcesay' ), run: () => {
			if ( S.tab !== 'survey' || ! R.opts ) {
				return;
			}
			S.draft.options.splice( Math.min( i, S.draft.options.length ), 0, o );
			renderOpts( '[data-k="' + o._k + '"] .ss-opt__label-input' );
			changed();
		} } );
	}

	function renderOpts( focusSel, flashKey ) {
		if ( ! R.opts ) {
			return;
		}
		closePopover();
		const list = S.draft.options;
		R.opts.textContent = '';
		list.forEach( ( o, i ) => R.opts.appendChild( optRow( o, i, list.length ) ) );
		R.addBtn.disabled = list.length >= MAX_OPTIONS;
		R.optCount.textContent = list.length >= MAX_OPTIONS
			? sprintf( /* translators: %d: maximum number of answers */ __( 'You reached the limit of %d answers.', 'sourcesay' ), MAX_OPTIONS )
			: sprintf( /* translators: 1: number of answers, 2: maximum */ __( '%1$d of %2$d answers', 'sourcesay' ), list.length, MAX_OPTIONS );
		updateErrors();
		if ( flashKey ) {
			const row = R.opts.querySelector( '[data-k="' + flashKey + '"]' );
			if ( row ) {
				row.classList.add( 'is-moved' );
			}
		}
		if ( focusSel ) {
			const f = R.opts.querySelector( focusSel );
			if ( f && ! f.disabled ) {
				f.focus();
			}
		}
	}

	function optRow( o, i, total ) {
		const name = () => o.label || __( 'this answer', 'sourcesay' );
		const labelErr = errBox( 'label:' + o._k );
		const labelId = uid( 'l' );
		const labelInput = el( 'input', {
			type: 'text',
			class: 'ss-input ss-opt__label-input',
			id: labelId,
			value: o.label,
			maxlength: 60,
			placeholder: __( 'Answer label, e.g. Instagram', 'sourcesay' ),
			'aria-describedby': labelErr.id,
			on: {
				input: () => {
					o.label = labelInput.value;
					changed();
				},
				blur: () => {
					S.touched.add( 'label:' + o._k );
					updateErrors();
				},
			},
		} );
		const iconBtn = el( 'button', {
			type: 'button',
			class: 'ss-opt__iconbtn' + ( o.icon ? '' : ' is-empty' ),
			'aria-haspopup': 'dialog',
			'aria-expanded': 'false',
			'aria-label': sprintf( /* translators: 1: icon name, 2: answer label */ __( 'Icon: %1$s. Change the icon for %2$s', 'sourcesay' ), o.icon ? ( ICON_LABELS[ o.icon ] || o.icon ) : __( 'none', 'sourcesay' ), name() ),
			on: { click: () => openIconPicker( iconBtn, o ) },
		}, o.icon ? ico( o.icon ) : ico( 'plus' ) );

		const fuBox = el( 'div', { class: 'ss-opt__fu', hidden: ! ( o.followup && o.followup.enabled ) },
			textField( { label: __( 'Follow-up question', 'sourcesay' ), value: o.followup.question, max: 120, errKey: 'fu:' + o._k, placeholder: __( 'e.g. Which podcast?', 'sourcesay' ), onInput: ( v ) => {
				o.followup.question = v;
				changed();
			} } ),
			textField( { label: __( 'Text box hint (optional)', 'sourcesay' ), value: o.followup.placeholder, max: 80, onInput: ( v ) => {
				o.followup.placeholder = v;
				changed();
			} } )
		);

		const row = el( 'li', { class: 'ss-opt' + ( o.enabled ? '' : ' is-off' ), 'data-k': o._k },
			el( 'div', { class: 'ss-opt__main' },
				el( 'span', { class: 'ss-drag', 'aria-hidden': 'true', title: __( 'Drag to reorder', 'sourcesay' ), on: { pointerdown: ( e ) => startDrag( e, row ) } }, ico( 'drag' ) ),
				iconBtn,
				el( 'div', { class: 'ss-opt__labelwrap' },
					el( 'label', { class: 'ss-sr', for: labelId, text: sprintf( /* translators: %d: answer position */ __( 'Answer %d label', 'sourcesay' ), i + 1 ) } ),
					labelInput,
					labelErr
				),
				el( 'button', { type: 'button', class: 'ss-icon-btn ss-icon-btn--danger', 'aria-label': sprintf( /* translators: %s: answer label */ __( 'Delete %s', 'sourcesay' ), name() ), on: { click: () => removeOption( o._k ) } }, ico( 'trash' ) )
			),
			el( 'div', { class: 'ss-opt__tools' },
				toggle( { compact: true, label: __( 'Shown', 'sourcesay' ), checked: o.enabled, ariaLabel: sprintf( /* translators: %s: answer label */ __( 'Show %s to customers', 'sourcesay' ), name() ), onChange: ( v ) => {
					o.enabled = v;
					row.classList.toggle( 'is-off', ! v );
					changed();
				} } ),
				toggle( { compact: true, label: __( 'Follow-up question', 'sourcesay' ), checked: o.followup.enabled, ariaLabel: sprintf( /* translators: %s: answer label */ __( 'Ask a follow-up question after %s', 'sourcesay' ), name() ), onChange: ( v ) => {
					o.followup.enabled = v;
					fuBox.hidden = ! v;
					if ( v ) {
						fuBox.querySelector( 'input' ).focus();
					}
					changed();
				} } ),
				el( 'span', { class: 'ss-spacer' } ),
				el( 'span', { class: 'ss-opt__move' },
					el( 'button', { type: 'button', class: 'ss-icon-btn ss-move-up', disabled: i === 0, 'aria-label': sprintf( /* translators: %s: answer label */ __( 'Move %s up', 'sourcesay' ), name() ), on: { click: () => moveOption( o._k, -1 ) } }, ico( 'arrow-up' ) ),
					el( 'button', { type: 'button', class: 'ss-icon-btn ss-move-down', disabled: i === total - 1, 'aria-label': sprintf( /* translators: %s: answer label */ __( 'Move %s down', 'sourcesay' ), name() ), on: { click: () => moveOption( o._k, 1 ) } }, ico( 'arrow-down' ) )
				)
			),
			fuBox
		);
		return row;
	}

	/* Pointer drag: rows swap live as the pointer crosses their midpoint. Keyboard users use the arrow buttons. */
	function startDrag( e, row ) {
		if ( e.button !== 0 ) {
			return;
		}
		e.preventDefault();
		const list = R.opts;
		const handle = e.currentTarget;
		handle.setPointerCapture( e.pointerId );
		row.classList.add( 'is-dragging' );
		const move = ( ev ) => {
			const rows = Array.from( list.children ).filter( ( r ) => r !== row );
			let before = null;
			for ( const r of rows ) {
				const b = r.getBoundingClientRect();
				if ( ev.clientY < b.top + b.height / 2 ) {
					before = r;
					break;
				}
			}
			if ( before !== row.nextSibling ) {
				list.insertBefore( row, before );
			}
		};
		const up = () => {
			handle.removeEventListener( 'pointermove', move );
			handle.removeEventListener( 'pointerup', up );
			handle.removeEventListener( 'pointercancel', up );
			row.classList.remove( 'is-dragging' );
			const order = Array.from( list.children ).map( ( r ) => r.getAttribute( 'data-k' ) );
			const k = row.getAttribute( 'data-k' );
			const before = S.draft.options.map( ( o ) => o._k ).join();
			S.draft.options.sort( ( a, b ) => order.indexOf( a._k ) - order.indexOf( b._k ) );
			if ( before !== order.join() ) {
				const pos = order.indexOf( k );
				renderOpts( null, k );
				announce( sprintf( /* translators: 1: answer label, 2: position, 3: total */ __( '%1$s moved to position %2$d of %3$d', 'sourcesay' ), S.draft.options[ pos ].label || __( 'Answer', 'sourcesay' ), pos + 1, order.length ) );
				changed();
			}
		};
		handle.addEventListener( 'pointermove', move );
		handle.addEventListener( 'pointerup', up );
		handle.addEventListener( 'pointercancel', up );
	}

	/* Icon picker popover */
	let pop = null;
	function closePopover( returnFocus ) {
		if ( ! pop ) {
			return;
		}
		const { node, trigger, onDoc, onPos } = pop;
		pop = null;
		node.remove();
		trigger.setAttribute( 'aria-expanded', 'false' );
		document.removeEventListener( 'pointerdown', onDoc, true );
		window.removeEventListener( 'scroll', onPos, true );
		window.removeEventListener( 'resize', onPos );
		if ( returnFocus && trigger.isConnected ) {
			trigger.focus();
		}
	}

	function openIconPicker( trigger, o ) {
		if ( pop && pop.trigger === trigger ) {
			closePopover( true );
			return;
		}
		closePopover();
		const titleId = uid( 'pt' );
		const current = o.icon || '';
		const name = ( k ) => ( k ? ( ICON_LABELS[ k ] || k.replace( /-/g, ' ' ) ) : __( 'No icon', 'sourcesay' ) );
		const choose = ( key ) => {
			o.icon = key;
			trigger.textContent = '';
			trigger.appendChild( ico( key || 'plus' ) );
			trigger.classList.toggle( 'is-empty', ! key );
			trigger.setAttribute( 'aria-label', sprintf( /* translators: 1: icon name, 2: answer label */ __( 'Icon: %1$s. Change the icon for %2$s', 'sourcesay' ), key ? ( ICON_LABELS[ key ] || key ) : __( 'none', 'sourcesay' ), o.label || __( 'this answer', 'sourcesay' ) ) );
			closePopover( true );
			changed();
		};
		// Groups in server order; any key the server lists outside a group lands in "More".
		const groups = Object.keys( S.iconGroups || {} ).map( ( g ) => ( { label: S.iconGroups[ g ].label || g, icons: ( S.iconGroups[ g ].icons || [] ).filter( ( k ) => S.icons.indexOf( k ) > -1 ) } ) );
		const grouped = new Set( groups.reduce( ( all, g ) => all.concat( g.icons ), [] ) );
		const loose = S.icons.filter( ( k ) => ! grouped.has( k ) );
		if ( loose.length ) {
			groups.push( { label: __( 'More', 'sourcesay' ), icons: loose } );
		}
		const words = ( s ) => String( s || '' ).toLowerCase().normalize( 'NFKD' ).replace( /[̀-ͯ]/g, '' ).split( /[^a-z0-9]+/ ).filter( Boolean );
		const iconBtn = ( k, groupLabel ) => {
			const b = el( 'button', {
				type: 'button',
				class: 'ss-icon-grid__btn',
				'aria-pressed': String( current === k ),
				'aria-label': name( k ),
				title: name( k ),
				tabindex: '-1',
				'data-k': k,
				on: { click: () => choose( k ) },
			}, ico( k ), current === k ? el( 'span', { class: 'ss-icon-grid__tick', 'aria-hidden': 'true' }, ico( 'check' ) ) : null );
			b._words = words( k + ' ' + name( k ) + ' ' + ( ICON_WORDS[ k ] || '' ) + ' ' + groupLabel );
			return b;
		};
		const none = el( 'button', {
			type: 'button',
			class: 'ss-icon-none',
			'aria-pressed': String( ! current ),
			tabindex: '-1',
			on: { click: () => choose( '' ) },
		}, el( 'span', { class: 'ss-icon-none__swatch', 'aria-hidden': 'true' } ), el( 'span', { text: __( 'No icon', 'sourcesay' ) } ), ! current ? ico( 'check' ) : null );
		const sections = groups.filter( ( g ) => g.icons.length ).map( ( g ) => {
			const hid = uid( 'pg' );
			const btns = g.icons.map( ( k ) => iconBtn( k, g.label ) );
			return { node: el( 'div', { class: 'ss-icon-group', role: 'group', 'aria-labelledby': hid },
				el( 'p', { class: 'ss-icon-group__label', id: hid, text: g.label } ),
				el( 'div', { class: 'ss-icon-grid' }, btns )
			), btns };
		} );
		const all = sections.reduce( ( list, s ) => list.concat( s.btns ), [] );
		const search = el( 'input', {
			type: 'search',
			class: 'ss-input ss-pop__search',
			placeholder: __( 'Search icons, e.g. podcast', 'sourcesay' ),
			'aria-label': __( 'Search icons', 'sourcesay' ),
			autocomplete: 'off',
			spellcheck: 'false',
		} );
		const count = el( 'p', { class: 'ss-sr', role: 'status', 'aria-live': 'polite' } );
		const emptyMsg = el( 'p', { class: 'ss-icon-empty', hidden: true } );
		const hint = el( 'p', { class: 'ss-pop__hint', 'aria-hidden': 'true', text: current ? name( current ) : __( 'Point at an icon to see its name.', 'sourcesay' ) } );
		const scroller = el( 'div', { class: 'ss-pop__scroll' }, sections.map( ( s ) => s.node ), emptyMsg );
		const node = el( 'div', { class: 'ss-pop ss-pop--icons', role: 'dialog', 'aria-labelledby': titleId },
			el( 'div', { class: 'ss-pop__head' },
				el( 'p', { class: 'ss-pop__title', id: titleId, text: __( 'Choose an icon', 'sourcesay' ) } ),
				el( 'button', { type: 'button', class: 'ss-icon-btn ss-icon-btn--sm', 'aria-label': __( 'Close', 'sourcesay' ), on: { click: () => closePopover( true ) } }, ico( 'close' ) )
			),
			el( 'div', { class: 'ss-pop__searchwrap' }, search ),
			none,
			scroller,
			hint,
			count
		);
		const visible = () => [ none ].concat( all.filter( ( b ) => ! b.hidden ) );
		const rove = ( b ) => {
			[ none ].concat( all ).forEach( ( x ) => {
				x.tabIndex = x === b ? 0 : -1;
			} );
		};
		const filter = () => {
			const q = words( search.value );
			let shown = 0;
			sections.forEach( ( s ) => {
				let n = 0;
				s.btns.forEach( ( b ) => {
					const hit = ! q.length || q.every( ( t ) => b._words.some( ( w ) => w.indexOf( t ) === 0 ) );
					b.hidden = ! hit;
					n += hit ? 1 : 0;
				} );
				s.node.hidden = ! n;
				shown += n;
			} );
			none.hidden = q.length > 0;
			emptyMsg.hidden = shown > 0;
			emptyMsg.textContent = shown ? '' : sprintf( /* translators: %s: search text */ __( 'No icons match “%s”. Try a channel type instead, like video, email or shop.', 'sourcesay' ), search.value.trim() );
			count.textContent = q.length ? sprintf( /* translators: %d: number of icons */ _n( '%d icon found', '%d icons found', shown, 'sourcesay' ), shown ) : '';
			const first = visible().find( ( b ) => ! b.hidden );
			const sel = visible().find( ( b ) => b.getAttribute( 'aria-pressed' ) === 'true' && ! b.hidden );
			rove( sel || first || none );
			scroller.scrollTop = 0;
		};
		search.addEventListener( 'input', filter );
		const showName = ( e ) => {
			const b = e.target.closest && e.target.closest( '.ss-icon-grid__btn' );
			if ( b ) {
				hint.textContent = name( b.getAttribute( 'data-k' ) );
			}
		};
		scroller.addEventListener( 'pointerover', showName );
		scroller.addEventListener( 'focusin', showName );
		// Arrow keys move by what is on screen, so rows work across group headings and while filtered.
		const step = ( from, key ) => {
			const list = visible().filter( ( b ) => ! b.hidden );
			const i = list.indexOf( from );
			if ( key === 'ArrowRight' ) {
				return list[ Math.min( list.length - 1, i + 1 ) ];
			}
			if ( key === 'ArrowLeft' ) {
				return i <= 0 ? null : list[ i - 1 ];
			}
			if ( key === 'Home' ) {
				return list[ 0 ];
			}
			if ( key === 'End' ) {
				return list[ list.length - 1 ];
			}
			// Row position in scroll-content coordinates, so icons scrolled out of view still sort correctly.
			const top = ( b ) => ( b === none ? -1e6 : b.getBoundingClientRect().top + scroller.scrollTop );
			const r = from.getBoundingClientRect();
			const fromTop = top( from );
			const cx = r.left + r.width / 2;
			const down = key === 'ArrowDown';
			const cands = list.filter( ( b ) => {
				const t = top( b );
				return down ? t > fromTop + 4 : t < fromTop - 4;
			} );
			if ( ! cands.length ) {
				return down ? from : null;
			}
			const rowTop = cands.reduce( ( m, b ) => {
				const t = top( b );
				return down ? Math.min( m, t ) : Math.max( m, t );
			}, down ? Infinity : -Infinity );
			const row = cands.filter( ( b ) => Math.abs( top( b ) - rowTop ) < 4 );
			return row.reduce( ( best, b ) => {
				const br = b.getBoundingClientRect();
				const d = Math.abs( br.left + br.width / 2 - cx );
				return ! best || d < best.d ? { b, d } : best;
			}, null ).b;
		};
		node.addEventListener( 'keydown', ( e ) => {
			if ( e.key === 'Escape' ) {
				e.preventDefault();
				e.stopPropagation();
				if ( document.activeElement === search && search.value ) {
					search.value = '';
					filter();
					return;
				}
				closePopover( true );
				return;
			}
			const a = document.activeElement;
			if ( a === search ) {
				if ( e.key === 'ArrowDown' || ( e.key === 'Enter' && search.value.trim() ) ) {
					e.preventDefault();
					const target = e.key === 'Enter' ? all.find( ( b ) => ! b.hidden ) : visible().find( ( b ) => b.tabIndex === 0 && ! b.hidden );
					if ( target && e.key === 'Enter' ) {
						choose( target.getAttribute( 'data-k' ) );
					} else if ( target ) {
						target.focus();
						target.scrollIntoView( { block: 'nearest' } );
					}
				}
				return;
			}
			const isItem = a === none || all.indexOf( a ) > -1;
			if ( e.key === 'Tab' ) {
				// Tab order: close, search, the active icon. Tabbing past the icons returns to the trigger.
				if ( isItem && ! e.shiftKey ) {
					e.preventDefault();
					closePopover( true );
				}
				return;
			}
			if ( ! isItem || [ 'ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End' ].indexOf( e.key ) < 0 ) {
				return;
			}
			e.preventDefault();
			const next = step( a, e.key );
			if ( ! next ) {
				search.focus();
				return;
			}
			rove( next );
			next.focus();
			if ( next === none ) {
				scroller.scrollTop = 0;
			} else {
				next.scrollIntoView( { block: 'nearest' } );
			}
		} );
		const place = () => {
			const r = trigger.getBoundingClientRect();
			const w = node.offsetWidth || 340;
			const h = node.offsetHeight || 420;
			let top = r.bottom + 6;
			if ( top + h > window.innerHeight - 8 ) {
				top = r.top - h - 6 > 8 ? r.top - h - 6 : Math.max( 8, window.innerHeight - h - 8 );
			}
			node.style.top = top + 'px';
			node.style.left = Math.max( 8, Math.min( r.left, document.documentElement.clientWidth - w - 8 ) ) + 'px';
		};
		node.style.position = 'fixed';
		mount.appendChild( node );
		place();
		const onDoc = ( e ) => {
			if ( ! node.contains( e.target ) && ! trigger.contains( e.target ) ) {
				closePopover();
			}
		};
		document.addEventListener( 'pointerdown', onDoc, true );
		window.addEventListener( 'scroll', place, true );
		window.addEventListener( 'resize', place );
		pop = { node, trigger, onDoc, onPos: place };
		trigger.setAttribute( 'aria-expanded', 'true' );
		node.addEventListener( 'focusout', ( e ) => {
			if ( e.relatedTarget && ! node.contains( e.relatedTarget ) && e.relatedTarget !== trigger ) {
				closePopover();
			}
		} );
		const sel = all.find( ( b ) => b.getAttribute( 'aria-pressed' ) === 'true' ) || none;
		rove( sel );
		// Mouse and keyboard users start typing straight away; on touch, skip the keyboard popping up.
		if ( window.matchMedia && window.matchMedia( '(pointer: fine)' ).matches ) {
			search.focus();
		} else {
			sel.focus( { preventScroll: true } );
		}
		sel.scrollIntoView( { block: 'nearest' } );
	}

	/* Live preview: same markup and survey.css as the front-end widget. */
	function renderPreview() {
		if ( ! R.preview || ! S.draft ) {
			return;
		}
		const d = S.draft;
		const frame = el( 'div', { class: 'ss-frame' + ( S.previewMobile ? ' is-mobile' : '' ) } );
		const opts = d.options.filter( ( o ) => o.enabled && String( o.label || '' ).trim() );
		frame.appendChild( el( 'p', { class: 'ss-frame__title', text: __( 'Order received', 'sourcesay' ) } ) );
		frame.appendChild( el( 'p', { class: 'ss-frame__note', text: __( 'Thank you. Your order has been received.', 'sourcesay' ) } ) );
		const details = el( 'div', { class: 'ss-frame__order', 'aria-hidden': 'true' }, el( 'span' ), el( 'span' ), el( 'span' ) );
		let survey;
		if ( ! opts.length ) {
			survey = el( 'p', { class: 'ss-frame__off', text: __( 'Show at least one answer to display the survey.', 'sourcesay' ) } );
		} else {
			survey = previewSurvey( d, opts );
		}
		if ( d.position === 'before' ) {
			add( frame, [ survey, details ] );
		} else {
			add( frame, [ details, survey ] );
		}
		R.preview.textContent = '';
		R.preview.appendChild( frame );
		const notes = [];
		if ( ! d.enabled ) {
			R.preview.insertBefore( el( 'p', { class: 'ss-frame__badge' }, ico( 'eye' ), __( 'Preview only. The survey is off, so customers do not see it yet.', 'sourcesay' ) ), frame );
		}
		if ( d.placement === 'manual' ) {
			notes.push( __( 'Customers see this only on pages where you added the SourceSay block or [sourcesay] shortcode.', 'sourcesay' ) );
		}
		if ( opts.length && d.shuffle ) {
			notes.push( __( 'Answers are shuffled for each order. “Other” always stays last.', 'sourcesay' ) );
		}
		R.preview.appendChild( el( 'div', { class: 'ss-frame__reset' },
			notes.length ? el( 'p', { class: 'ss-field__help', text: notes.join( ' ' ) } ) : null,
			el( 'button', { type: 'button', class: 'ss-btn ss-btn--tertiary ss-btn--sm', on: { click: renderPreview } }, ico( 'refresh' ), __( 'Reset preview', 'sourcesay' ) )
		) );
	}

	function previewSurvey( d, opts ) {
		const accent = /^#[0-9a-f]{6}$/i.test( d.accent ) ? d.accent : '';
		const qid = uid( 'pq' );
		const fuId = uid( 'pf' );
		const otherId = uid( 'po' );
		const name = uid( 'pr' );
		const items = opts.map( ( o ) => ( { id: o.id || o._k, label: o.label, icon: o.icon, fu: o.followup && o.followup.enabled ? o.followup : null } ) );
		if ( d.other.enabled ) {
			items.push( { id: 'other', label: d.other.label || __( 'Other', 'sourcesay' ), icon: 'question', other: true } );
		}
		const fuLabel = el( 'label', { class: 'ss-field__label', for: fuId } );
		const fuInput = el( 'input', { class: 'ss-input', type: 'text', id: fuId } );
		const fuField = el( 'div', { class: 'ss-field ss-field--followup' }, fuLabel, fuInput );
		const otherInput = el( 'input', { class: 'ss-input', type: 'text', id: otherId } );
		const otherField = el( 'div', { class: 'ss-field ss-field--other' }, el( 'label', { class: 'ss-field__label', for: otherId, text: d.other.placeholder || __( 'Tell us where', 'sourcesay' ) } ), otherInput );
		const section = el( 'section', { class: 'sourcesay ss-survey ss-js ss-layout-' + ( d.layout === 'list' ? 'list' : 'buttons' ), style: accent ? '--ss-accent:' + accent : null, 'aria-labelledby': qid } );
		const done = () => {
			section.classList.remove( 'is-open' );
			section.textContent = '';
			section.appendChild( el( 'p', { class: 'ss-done' }, el( 'span', { class: 'ss-done__icon' }, ico( 'check', 'ss-icon' ) ), el( 'span', { class: 'ss-done__text', text: d.thank_you } ) ) );
		};
		const form = el( 'form', { class: 'ss-form', on: { submit: ( e ) => {
			e.preventDefault();
			done();
		} } },
		el( 'fieldset', { class: 'ss-fieldset' },
			el( 'legend', { class: 'ss-question', id: qid, text: d.question || __( 'How did you hear about us?', 'sourcesay' ) } ),
			el( 'p', { class: 'ss-hint', text: __( 'Optional. Pick the one that fits best.', 'sourcesay' ) } ),
			el( 'div', { class: 'ss-options' }, items.map( ( it ) => el( 'label', { class: 'ss-option' },
				el( 'input', { class: 'ss-radio', type: 'radio', name, value: it.id, on: { click: () => {
					if ( it.fu || it.other ) {
						fuField.hidden = ! it.fu;
						otherField.hidden = ! it.other;
						if ( it.fu ) {
							fuLabel.textContent = it.fu.question;
							fuInput.placeholder = it.fu.placeholder || '';
						}
						section.classList.add( 'is-open' );
					} else {
						done();
					}
				} } } ),
				el( 'span', { class: 'ss-option__box' },
					it.icon ? ico( it.icon, 'ss-icon' ) : null,
					el( 'span', { class: 'ss-option__label', text: it.label } ),
					el( 'span', { class: 'ss-option__dot', 'aria-hidden': 'true' } )
				)
			) ) )
		),
		el( 'div', { class: 'ss-more' }, fuField, d.other.enabled ? otherField : null, el( 'button', { type: 'submit', class: 'ss-send' }, el( 'span', { text: __( 'Send', 'sourcesay' ) } ) ) ),
		d.allow_skip ? el( 'div', { class: 'ss-skip' }, el( 'button', { type: 'button', class: 'ss-skip__btn', text: String( d.skip_label || '' ).trim() || __( 'Prefer not to say', 'sourcesay' ), on: { click: () => {
			section.classList.remove( 'is-open' );
			section.classList.add( 'is-skipped' );
			section.textContent = '';
			section.appendChild( el( 'p', { class: 'ss-done ss-done--quiet' }, el( 'span', { class: 'ss-done__icon' }, ico( 'check', 'ss-icon' ) ), el( 'span', { class: 'ss-done__text', text: __( 'No problem, thanks!', 'sourcesay' ) } ) ) );
		} } } ) ) : null
		);
		section.appendChild( form );
		return section;
	}

	/* ------------------------------------------------------------------ */
	/* Settings tab                                                       */
	/* ------------------------------------------------------------------ */
	function renderSettings( wrap ) {
		if ( ! settingsGate( wrap, __( 'Settings', 'sourcesay' ), __( 'Control where customers can answer and how long answers are kept.', 'sourcesay' ) ) ) {
			return;
		}
		const d = S.draft;
		const ret = parseInt( d.retention_days, 10 ) || 0;
		const retOpts = [ [ 0, __( 'Keep forever', 'sourcesay' ) ], [ 90, __( '90 days', 'sourcesay' ) ], [ 180, __( '180 days', 'sourcesay' ) ], [ 365, __( '365 days', 'sourcesay' ) ] ];
		if ( ! retOpts.some( ( r ) => r[ 0 ] === ret ) ) {
			retOpts.push( [ ret, sprintf( /* translators: %d: number of days */ _n( '%d day', '%d days', ret, 'sourcesay' ), ret ) ] );
		}
		const uninstallWarn = el( 'div', { class: 'ss-notice ss-notice--warning', hidden: ! d.delete_on_uninstall }, ico( 'warning' ),
			el( 'span', { text: __( 'Deleting SourceSay from the Plugins screen will permanently remove every answer and setting. This cannot be undone.', 'sourcesay' ) } )
		);

		const left = el( 'div', { class: 'ss-stack' },
			card( { icon: 'user-plus', title: __( 'My Account', 'sourcesay' ) },
				toggle( { label: __( 'Ask again in My Account', 'sourcesay' ), help: __( 'Customers who skipped the question can answer it on My Account > Orders > View for 30 days after ordering.', 'sourcesay' ), checked: d.show_in_account, onChange: ( v ) => {
					d.show_in_account = v;
					changed( { preview: false } );
				} } )
			),
			card( { icon: 'calendar', tone: 'cream', title: __( 'Data', 'sourcesay' ) },
				el( 'div', { class: 'ss-stack' },
					selectField( { label: __( 'Keep answers for', 'sourcesay' ), value: ret, options: retOpts, help: __( 'Older answers are deleted once a day. Your WooCommerce orders are never touched.', 'sourcesay' ), onChange: ( v ) => {
						d.retention_days = parseInt( v, 10 ) || 0;
						changed( { preview: false } );
					} } ),
					el( 'hr', { class: 'ss-divider' } ),
					toggle( { label: __( 'Delete all SourceSay data when the plugin is deleted', 'sourcesay' ), help: __( 'Deactivating the plugin always keeps your data.', 'sourcesay' ), checked: d.delete_on_uninstall, onChange: ( v ) => {
						d.delete_on_uninstall = v;
						uninstallWarn.hidden = ! v;
						changed( { preview: false } );
					} } ),
					uninstallWarn
				)
			)
		);
		const check = ( text ) => el( 'li', null, ico( 'check' ), el( 'span', { text } ) );
		left.appendChild( card( { icon: 'eye', tone: 'orange', title: __( 'Where you see each answer', 'sourcesay' ), desc: __( 'Besides Reports, every answer also shows up where you already work.', 'sourcesay' ) },
			el( 'div', { class: 'ss-stack' },
				el( 'ul', { class: 'ss-list-check' },
					check( __( 'A private order note: “Customer said: Instagram”', 'sourcesay' ) ),
					check( __( 'The “Heard about us” column, filter and search on the Orders screen', 'sourcesay' ) ),
					check( __( 'The customer’s user profile, under “How they found you”', 'sourcesay' ) ),
					check( __( 'Admin emails sent after the customer answered, such as order status changes', 'sourcesay' ) )
				),
				el( 'div', { class: 'ss-notice' }, ico( 'info' ), el( 'span', { text: __( 'The “New order” email goes out the moment the order is placed, before the customer sees the question, so it cannot include the answer. Check the order notes or the Orders screen instead.', 'sourcesay' ) } ) )
			)
		) );
		const right = card( { icon: 'shield', tone: 'green', title: __( 'Privacy', 'sourcesay' ), desc: __( 'Answers stay in your WordPress database. Nothing is sent to SwiftWebDev or anyone else.', 'sourcesay' ) },
			el( 'div', { class: 'ss-stack' },
				el( 'div', null,
					el( 'h3', { class: 'ss-card__sub', text: __( 'What is stored for each answer', 'sourcesay' ) } ),
					el( 'ul', { class: 'ss-list-check' },
						check( __( 'The answer and any text the customer typed', 'sourcesay' ) ),
						check( __( 'Order total, currency and status, kept in sync with refunds', 'sourcesay' ) ),
						check( __( 'Whether the customer had ordered before', 'sourcesay' ) ),
						check( __( 'WooCommerce’s own order attribution source, when it exists', 'sourcesay' ) )
					)
				),
				el( 'div', { class: 'ss-notice' }, ico( 'shield' ),
					el( 'span', { text: __( 'Answers are included in Tools > Export Personal Data and Tools > Erase Personal Data, so you can handle customer privacy requests as usual.', 'sourcesay' ) } )
				)
			)
		);
		const extra = applyHook( 'sourcesay.settings.cards', [], { draft: d, changed: () => changed( { preview: false } ), ui: UI } );
		add( left, extra );
		wrap.appendChild( el( 'div', { class: 'ss-settings' }, left, right ) );
		wrap.appendChild( devPanel() );
		wrap.appendChild( saveBar() );
	}

	/* ------------------------------------------------------------------ */
	/* Boot                                                               */
	/* ------------------------------------------------------------------ */
	/* Helpers handed to extensions (SourceSay Pro) so their cards and tabs match this design system. */
	const UI = {
		el, ico, card, toast, textField, toggle, selectField, seg, tip, labelWithTip, details, codeBlock, copyText,
		pageHead, errorCard, errText, uid, fmtNum, fmtMoney, fmtPct, fmtDay,
		render: () => render(),
	};

	/** Run a wp.hooks filter that returns a list; a broken extension result falls back to the original list. */
	function applyHook( name, list, ctx ) {
		if ( ! wp.hooks ) {
			return list;
		}
		try {
			const out = wp.hooks.applyFilters( name, list, ctx );
			return Array.isArray( out ) ? out : list;
		} catch ( e ) {
			window.console && window.console.error( e ); // eslint-disable-line no-console
			return list;
		}
	}

	function boot() {
		buildShell();
		S.tab = tabFromHash();
		render();
		loadSettings();
		loadStatus();
		loadReport();
	}
	// Extension scripts may print after this file, so wait until every script on the page has run.
	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', boot );
	} else {
		boot();
	}
}() );
