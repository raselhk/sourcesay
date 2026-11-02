/**
 * SourceSay admin app: Reports, Survey builder, Settings.
 * Vanilla JS, no build step. Uses wp.apiFetch (REST nonce) and wp.i18n.
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

	const ICON_KEYS = [ 'google', 'instagram', 'facebook', 'tiktok', 'youtube', 'pinterest', 'linkedin', 'x', 'reddit', 'users', 'microphone', 'star', 'envelope', 'article', 'megaphone', 'storefront', 'map-pin', 'newspaper', 'radio', 'calendar', 'chat', 'tag', 'globe', 'question' ];
	const ICON_LABELS = {
		google: 'Google',
		instagram: 'Instagram',
		facebook: 'Facebook',
		tiktok: 'TikTok',
		youtube: 'YouTube',
		pinterest: 'Pinterest',
		linkedin: 'LinkedIn',
		x: 'X',
		reddit: 'Reddit',
		users: __( 'People', 'sourcesay' ),
		microphone: __( 'Microphone', 'sourcesay' ),
		star: __( 'Star', 'sourcesay' ),
		envelope: __( 'Envelope', 'sourcesay' ),
		article: __( 'Article', 'sourcesay' ),
		megaphone: __( 'Megaphone', 'sourcesay' ),
		storefront: __( 'Storefront', 'sourcesay' ),
		'map-pin': __( 'Map pin', 'sourcesay' ),
		newspaper: __( 'Newspaper', 'sourcesay' ),
		radio: __( 'Radio', 'sourcesay' ),
		calendar: __( 'Calendar', 'sourcesay' ),
		chat: __( 'Chat', 'sourcesay' ),
		tag: __( 'Tag', 'sourcesay' ),
		globe: __( 'Globe', 'sourcesay' ),
		question: __( 'Question mark', 'sourcesay' ),
	};
	const PRESET_LABELS = {
		general: __( 'General store', 'sourcesay' ),
		fashion: __( 'Fashion and beauty', 'sourcesay' ),
		b2b: __( 'B2B and services', 'sourcesay' ),
		local: __( 'Local business', 'sourcesay' ),
	};
	const TABS = [
		{ id: 'reports', label: __( 'Reports', 'sourcesay' ), icon: 'chart' },
		{ id: 'survey', label: __( 'Survey', 'sourcesay' ), icon: 'list' },
		{ id: 'settings', label: __( 'Settings', 'sourcesay' ), icon: 'gear' },
	];

	/* ------------------------------------------------------------------ */
	/* State                                                              */
	/* ------------------------------------------------------------------ */
	const S = {
		tab: null,
		saved: null,
		draft: null,
		presets: {},
		icons: ICON_KEYS,
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
		setup: { step: 1, preset: 'general', test: 'idle', url: '', base: null, timer: 0, started: 0 },
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
			return withSymbol( numberFormat( v / 1000, v >= 10000 ? 0 : 1, c.thousand, c.decimal ) + 'k', c );
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
				enabled: true,
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
						problems.push( { code: 'survey_disabled', message: 'The survey is turned off.' } );
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
					resolve( { settings: clone( mockStore.settings ), presets: clone( mockStore.presets ), icons: ICON_KEYS.slice() } );
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

	function details( summary, body, open ) {
		return el( 'details', { class: 'ss-details', open: !! open },
			el( 'summary', { class: 'ss-details__summary' }, el( 'span', { text: summary } ), ico( 'caret-down', 'ss-ico ss-details__caret' ) ),
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
	const nav = el( 'nav', { class: 'ss-tabs', 'aria-label': __( 'SourceSay sections', 'sourcesay' ) },
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
		}, ico( t.icon ), t.label ) )
	);
	const header = el( 'header', { class: 'ss-header' },
		el( 'div', { class: 'ss-brand' },
			el( 'span', { class: 'ss-brand__mark' }, ico( 'responses' ) ),
			el( 'span', { class: 'ss-brand__text' },
				el( 'span', { class: 'ss-brand__name', text: 'SourceSay' } ),
				el( 'span', { class: 'ss-brand__by', text: __( 'by SwiftWebDev', 'sourcesay' ) } )
			)
		),
		nav
	);
	const main = el( 'div', { class: 'ss-content', id: 'ss-main' } );

	mount.textContent = '';
	add( mount, [ header, main, toastBox, live ] );

	if ( SURVEY_CSS && ! document.getElementById( 'sourcesay-survey-css' ) ) {
		document.head.appendChild( el( 'link', { rel: 'stylesheet', id: 'sourcesay-survey-css', href: SURVEY_CSS } ) );
	}

	function tabFromHash() {
		const h = location.hash.replace( '#', '' );
		return TABS.some( ( t ) => t.id === h ) ? h : 'reports';
	}

	function needsLeaveWarning( next ) {
		return S.tab !== 'reports' && next === 'reports' && isDirty() && ! S.allowNav;
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
		const wrap = el( 'div', { class: 'ss-wrap' } );
		main.appendChild( wrap );
		if ( S.tab === 'reports' ) {
			renderReports( wrap );
		} else if ( S.tab === 'survey' ) {
			renderSurvey( wrap );
		} else {
			renderSettings( wrap );
		}
		if ( focus ) {
			const h1 = main.querySelector( 'h1' );
			if ( h1 ) {
				h1.focus( { preventScroll: true } );
			}
			window.scrollTo( 0, 0 );
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
		const rangeText = S.range.from ? sprintf( /* translators: 1: start date, 2: end date */ __( 'Showing %1$s to %2$s.', 'sourcesay' ), fmtDay( S.range.from ), fmtDay( S.range.to, true ) ) : '';
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
		if ( ! t.responses ) {
			body.appendChild( reportEmpty( t ) );
			return;
		}
		body.appendChild( el( 'div', { class: 'ss-grid' }, kpis( t ) ) );
		body.appendChild( channelsCard( rep ) );
		body.appendChild( el( 'div', { class: 'ss-grid' },
			el( 'div', { class: 'ss-span-8' }, trendCard( rep ) ),
			el( 'div', { class: 'ss-span-4' }, nvrCard( rep ) )
		) );
		body.appendChild( toldCard( rep ) );
		body.appendChild( el( 'section', { class: 'ss-card' }, howToRead() ) );
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
		const text = paid
			? sprintf( /* translators: %s: number of paid orders */ _n( 'There was %s paid order in this range, but nobody has answered yet.', 'There were %s paid orders in this range, but nobody has answered yet.', paid, 'sourcesay' ), fmtNum( paid ) )
			: __( 'Answers show up here as soon as customers reply on the order confirmation page. No numbers are shown until real answers arrive.', 'sourcesay' );
		return el( 'div', { class: 'ss-card' },
			el( 'div', { class: 'ss-empty' },
				el( 'span', { class: 'ss-empty__icon' }, ico( 'responses' ) ),
				el( 'h2', { class: 'ss-empty__title', text: __( 'No answers yet', 'sourcesay' ) } ),
				el( 'p', { class: 'ss-empty__text', text } ),
				el( 'ol', { class: 'ss-steps' },
					el( 'li', { text: __( 'Check that the survey is turned on in the Survey tab.', 'sourcesay' ) } ),
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

	function kpis( t ) {
		const tile = ( icon, tone, label, value, meta, help ) => el( 'div', { class: 'ss-card ss-span-3' },
			el( 'div', { class: 'ss-kpi' },
				el( 'span', { class: 'ss-kpi__icon' + ( tone ? ' ss-kpi__icon--' + tone : '' ) }, ico( icon ) ),
				el( 'span', { class: 'ss-kpi__label' }, labelWithTip( label, help ) ),
				el( 'span', { class: 'ss-kpi__value', text: value } ),
				el( 'span', { class: 'ss-kpi__meta', text: meta } )
			)
		);
		const paid = +t.paid_orders || 0;
		return [
			tile( 'responses', '', __( 'Answers', 'sourcesay' ), fmtNum( t.responses ), sprintf( /* translators: %s: number of paid orders */ _n( 'From %s paid order', 'From %s paid orders', paid, 'sourcesay' ), fmtNum( paid ) ), __( 'How many customers picked an answer. Test orders are not counted.', 'sourcesay' ) ),
			tile( 'percent', 'purple', __( 'Response rate', 'sourcesay' ), fmtPct( t.response_rate, 1 ), __( 'Paid orders that answered', 'sourcesay' ), __( 'Out of every paid order in this date range, the share whose customer answered the question. 30% means 3 in 10 customers answered.', 'sourcesay' ) ),
			tile( 'revenue', 'green', __( 'Revenue from answered orders', 'sourcesay' ), fmtMoney( t.revenue ), __( 'Paid orders, minus refunds', 'sourcesay' ), __( 'The total spent on orders whose customer answered, after refunds. Orders without an answer are not included.', 'sourcesay' ) ),
			tile( 'receipt', 'orange', __( 'Average order value', 'sourcesay' ), fmtMoney( t.aov ), __( 'Across answered orders', 'sourcesay' ), __( 'Revenue from answered orders divided by the number of those orders: what one of these customers spends per order.', 'sourcesay' ) ),
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

	function channelsCard( rep ) {
		const chans = rep.channels || [];
		const maxShare = Math.max( 0.0001, ...chans.map( ( c ) => Math.max( +c.share_responses || 0, +c.share_revenue || 0 ) ) );

		const legend = el( 'div', { class: 'ss-legend', 'aria-hidden': 'true' },
			el( 'span', { class: 'ss-legend__item' }, el( 'span', { class: 'ss-swatch ss-swatch--responses' } ), __( 'Share of answers', 'sourcesay' ) ),
			el( 'span', { class: 'ss-legend__item' }, el( 'span', { class: 'ss-swatch' } ), __( 'Share of revenue', 'sourcesay' ) )
		);

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
						el( 'span', { class: 'ss-chan__icon' }, ico( c.icon || ( c.answer_id === 'other' ? 'question' : 'tag' ) ) ),
						el( 'span', { text: c.label } )
					)
				),
				el( 'td', { class: 'is-num', 'data-label': L.resp, text: fmtNum( c.responses ) } ),
				el( 'td', { class: 'is-num', 'data-label': L.rev, text: fmtMoney( c.revenue ) } ),
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

		return card( { title: __( 'Channels', 'sourcesay' ), desc: __( 'Ranked by revenue. A revenue bar longer than its answers bar means that channel brings bigger orders.', 'sourcesay' ), actions: legend },
			insightsBlock( rep ),
			el( 'div', { class: 'ss-table-wrap' },
				el( 'table', { class: 'ss-table ss-chan-table' },
					el( 'caption', { class: 'ss-sr', text: __( 'Answers and revenue by channel', 'sourcesay' ) } ),
					el( 'thead', null, el( 'tr', null,
						el( 'th', { scope: 'col', text: L.chan } ),
						el( 'th', { scope: 'col', class: 'is-num' }, labelWithTip( L.resp, __( 'How many customers picked this channel.', 'sourcesay' ) ) ),
						el( 'th', { scope: 'col', class: 'is-num' }, labelWithTip( L.rev, __( 'Total spent by these customers on the orders where they answered, after refunds.', 'sourcesay' ) ) ),
						el( 'th', { scope: 'col', class: 'is-num' }, labelWithTip( L.aov, __( 'What a customer from this channel spends per order, on average.', 'sourcesay' ) ) ),
						el( 'th', { scope: 'col', class: 'ss-col-bars' }, labelWithTip( L.bars, __( 'Light bar: this channel’s share of all answers. Dark bar: its share of all revenue from answered orders. A longer dark bar means bigger spenders.', 'sourcesay' ) ) ),
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
		const problems = st.problems || [];
		const live = !! st.survey_live;
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
		] );
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

	function finishSetup( tested ) {
		const st = S.setup;
		clearInterval( st.timer );
		const wasFirstRun = ! st.fromStatus;
		S.setupOpen = false;
		S.setup = { step: 1, preset: st.preset, test: 'idle', url: '', base: null, timer: 0, started: 0 };
		if ( S.status ) {
			S.status.setup_done = true;
		}
		if ( wasFirstRun ) {
			api( '/admin/setup-done', { method: 'POST' } ).catch( () => {} );
			toast( 'success', tested ? __( 'Setup finished. Your survey is live.', 'sourcesay' ) : __( 'Setup closed. You can place a test order any time from Reports.', 'sourcesay' ) );
		}
		render( true );
		loadStatus();
		loadReport();
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
			firstRun ? __( 'Three quick steps and your survey is live. You can change everything later.', 'sourcesay' ) : __( 'Place a test order and answer the question, just like a customer would.', 'sourcesay' ),
			el( 'button', { type: 'button', class: 'ss-btn ss-btn--tertiary', text: firstRun ? __( 'Skip setup', 'sourcesay' ) : __( 'Close', 'sourcesay' ), on: { click: () => finishSetup( false ) } } )
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
						toggle( { label: __( 'Ask customers after checkout', 'sourcesay' ), help: __( 'Customers can always skip the question.', 'sourcesay' ), checked: d.enabled, onChange: ( v ) => {
							d.enabled = v;
							changed();
						} } ),
						textField( { label: __( 'Question text', 'sourcesay' ), value: d.question, max: 160, errKey: 'question', onInput: ( v ) => {
							d.question = v;
							changed();
						} } ),
						textField( { label: __( 'Thank-you message', 'sourcesay' ), value: d.thank_you, max: 120, errKey: 'thank_you', onInput: ( v ) => {
							d.thank_you = v;
							changed();
						} } ),
						el( 'p', { class: 'ss-field__help', text: __( 'Answers, icons, follow-up questions, colours and placement can be changed any time in the Survey tab.', 'sourcesay' ) } )
					),
					foot( back( 1 ), next )
				) ),
				el( 'div', { class: 'ss-builder__side' }, card( { title: __( 'Preview', 'sourcesay' ), desc: __( 'Click an answer to try it.', 'sourcesay' ) }, R.preview ) )
			) );
			renderPreview();
			updateErrors();
			return;
		}

		// Step 3: test order.
		const problems = ( S.status && S.status.problems ) || [];
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
				el( 'p', { class: 'ss-muted', text: __( 'From now on, customers see this question right after checkout. Their answers show up in Reports.', 'sourcesay' ) } )
			);
		} else if ( st.test === 'timeout' ) {
			panel = el( 'div', { class: 'ss-notice ss-notice--warning', role: 'status' }, ico( 'warning' ), el( 'div', { class: 'ss-notice__body' },
				el( 'span', { text: __( 'No answer arrived in 10 minutes. If the question was missing on the test page, a caching plugin may be serving an old copy: exclude /checkout/order-received/ from caching and try again.', 'sourcesay' ) } ),
				el( 'button', { type: 'button', class: 'ss-btn ss-btn--secondary ss-btn--sm', text: __( 'Try again', 'sourcesay' ), on: { click: placeTest } } )
			) );
		} else {
			panel = el( 'div', { class: 'ss-test-start' },
				st.test === 'error' ? el( 'p', { class: 'ss-field__error', role: 'alert' }, ico( 'warning' ), el( 'span', { text: sprintf( /* translators: %s: error message */ __( 'The test order could not be created. %s', 'sourcesay' ), errText( st.err ) ) } ) ) : null,
				el( 'button', { type: 'button', class: 'ss-btn ss-btn--primary' + ( st.test === 'creating' ? ' is-busy' : '' ), on: { click: placeTest } }, ico( 'bag' ), __( 'Place a test order', 'sourcesay' ), el( 'span', { class: 'ss-sr', text: __( '(opens in a new tab)', 'sourcesay' ) } ) ),
				el( 'p', { class: 'ss-field__help', text: __( 'Opens the order confirmation page in a new tab. The test order is marked as a test, sends no emails, and is never counted in your reports.', 'sourcesay' ) } )
			);
		}
		const doneLabel = firstRun ? __( 'Finish setup', 'sourcesay' ) : __( 'Done', 'sourcesay' );
		wrap.appendChild( el( 'section', { class: 'ss-card ss-setup' }, el( 'div', { class: 'ss-card__body' },
			title( __( 'See it live', 'sourcesay' ), __( 'Place a test order and answer the question, just like a customer would.', 'sourcesay' ) ),
			problems.length ? el( 'div', { class: 'ss-notice ss-notice--warning', style: 'margin-top:16px' }, ico( 'warning' ), el( 'div', { class: 'ss-notice__body' }, el( 'span', { text: problems.map( ( p ) => p.message ).join( ' ' ) } ), el( 'a', { class: 'ss-btn ss-btn--secondary ss-btn--sm', href: '#survey', text: __( 'Open Survey', 'sourcesay' ) } ) ) ) : null,
			el( 'div', { style: 'margin-top:20px' }, panel ),
			foot(
				firstRun ? back( 2 ) : null,
				st.test === 'arrived' || ( S.status && S.status.test_orders ) ? el( 'button', { type: 'button', class: 'ss-btn ss-btn--neutral', on: { click: ( e ) => deleteTests( e.currentTarget ) } }, ico( 'trash' ), __( 'Delete test orders', 'sourcesay' ) ) : null,
				st.test === 'arrived'
					? el( 'button', { type: 'button', class: 'ss-btn ss-btn--primary', on: { click: () => finishSetup( true ) } }, ico( 'check' ), doneLabel )
					: el( 'button', { type: 'button', class: 'ss-btn ss-btn--tertiary', text: firstRun ? __( 'Finish without testing', 'sourcesay' ) : __( 'Close', 'sourcesay' ), on: { click: () => finishSetup( false ) } } )
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
			[ 'sourcesay_response_saved', __( 'Action', 'sourcesay' ), '$id, $data, $order', __( 'Send each new answer to a CRM, Slack or analytics.', 'sourcesay' ) ],
		] );
		const ex1 = "// Do not ask customers who paid by bank transfer.\nadd_filter( 'sourcesay_should_display', function ( $show, $order, $context ) {\n\tif ( 'bacs' === $order->get_payment_method() ) {\n\t\treturn false;\n\t}\n\treturn $show;\n}, 10, 3 );";
		const ex2 = "// Add the answer to the order notes.\nadd_action( 'sourcesay_response_saved', function ( $id, $data, $order ) {\n\t$order->add_order_note( 'Heard about us: ' . $data['answer_label'] );\n}, 10, 3 );";
		const ex3 = "// Keep follow-up text short.\nadd_filter( 'sourcesay_response_data', function ( $data, $order ) {\n\t$data['followup_text'] = mb_substr( (string) $data['followup_text'], 0, 120 );\n\treturn $data;\n}, 10, 2 );";
		const rest = table( [ __( 'Route', 'sourcesay' ), __( 'Method', 'sourcesay' ), __( 'Who can call it', 'sourcesay' ), __( 'What it does', 'sourcesay' ) ], [
			[ NS + '/response', 'POST', __( 'Anyone with the order key', 'sourcesay' ), __( 'Saves an answer. Body: order_id, order_key, answer_id, followup_text, other_text. Limited to 10 calls per 10 minutes per visitor.', 'sourcesay' ) ],
			[ NS + '/admin/report', 'GET', __( 'Shop managers', 'sourcesay' ), __( 'Report data. Optional from and to (YYYY-MM-DD, store time).', 'sourcesay' ) ],
			[ NS + '/admin/settings', 'GET, POST', __( 'Shop managers', 'sourcesay' ), __( 'Read or save the survey settings.', 'sourcesay' ) ],
			[ NS + '/admin/status', 'GET', __( 'Shop managers', 'sourcesay' ), __( 'Is the survey live, and what is stopping it.', 'sourcesay' ) ],
			[ NS + '/admin/test-order', 'POST', __( 'Shop managers', 'sourcesay' ), __( 'Creates a test order and returns its confirmation page URL.', 'sourcesay' ) ],
			[ NS + '/admin/test-orders', 'DELETE', __( 'Shop managers', 'sourcesay' ), __( 'Deletes every test order and its answer.', 'sourcesay' ) ],
		] );
		const curl = "curl -X POST '" + base + "/response' \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"order_id\":123,\"order_key\":\"wc_order_abc123\",\"answer_id\":\"instagram\"}'";
		const csv = table( [ __( 'Column', 'sourcesay' ), __( 'Meaning', 'sourcesay' ) ], [
			[ 'date', __( 'When the customer answered (store time)', 'sourcesay' ) ],
			[ 'order_id', __( 'WooCommerce order ID', 'sourcesay' ) ],
			[ 'order_number', __( 'Order number as customers see it', 'sourcesay' ) ],
			[ 'answer', __( 'The answer label they picked', 'sourcesay' ) ],
			[ 'follow_up', __( 'Follow-up text, if any', 'sourcesay' ) ],
			[ 'other', __( 'Text typed for “Other”, if any', 'sourcesay' ) ],
			[ 'order_total', __( 'Order total minus refunds', 'sourcesay' ) ],
			[ 'currency', __( 'Order currency code', 'sourcesay' ) ],
			[ 'status', __( 'Order status', 'sourcesay' ) ],
			[ 'returning', __( '1 if the customer had paid for an earlier order', 'sourcesay' ) ],
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
			el( 'h3', { class: 'ss-card__sub', text: __( 'REST API', 'sourcesay' ) } ),
			el( 'p', { class: 'ss-field__help' }, __( 'Base URL:', 'sourcesay' ) + ' ', el( 'code', { text: base } ), ' ' + __( 'Admin routes need a logged-in user who can manage WooCommerce (cookie and X-WP-Nonce header, or an application password).', 'sourcesay' ) ),
			rest,
			codeBlock( curl, __( 'Save an answer with curl', 'sourcesay' ) ),
			el( 'h3', { class: 'ss-card__sub', text: __( 'CSV export columns', 'sourcesay' ) } ),
			el( 'p', { class: 'ss-field__help', text: __( 'Export from Reports. Test orders are left out, and cells that start with = + - @ are escaped so spreadsheets do not run them as formulas.', 'sourcesay' ) } ),
			csv,
		] ) );
	}

	function niceMax( v, integer ) {
		if ( v <= 0 ) {
			return integer ? 4 : 100;
		}
		const p = Math.pow( 10, Math.floor( Math.log10( v ) ) );
		const m = v / p;
		let n = 10;
		if ( m <= 1 ) {
			n = 1;
		} else if ( m <= 2 ) {
			n = 2;
		} else if ( m <= 2.5 ) {
			n = 2.5;
		} else if ( m <= 5 ) {
			n = 5;
		}
		let max = n * p;
		if ( integer ) {
			max = Math.max( 4, Math.ceil( max / 4 ) * 4 );
		}
		return max;
	}

	function trendCard( rep ) {
		const rows = rep.trend || [];
		const box = el( 'div', { class: 'ss-chart' } );
		const metricSeg = seg( __( 'Chart metric', 'sourcesay' ), [ [ 'responses', __( 'Answers', 'sourcesay' ) ], [ 'revenue', __( 'Revenue', 'sourcesay' ) ] ], S.chartMetric, ( m ) => {
			S.chartMetric = m;
			metricSeg.querySelectorAll( 'button' ).forEach( ( b, i ) => b.setAttribute( 'aria-pressed', String( ( i === 0 ? 'responses' : 'revenue' ) === m ) ) );
			drawChart( box, rows );
		}, true );
		const table = el( 'table', { class: 'ss-sr' },
			el( 'caption', { text: __( 'Answers and revenue per day', 'sourcesay' ) } ),
			el( 'thead', null, el( 'tr', null, el( 'th', { scope: 'col', text: __( 'Date', 'sourcesay' ) } ), el( 'th', { scope: 'col', text: __( 'Answers', 'sourcesay' ) } ), el( 'th', { scope: 'col', text: __( 'Revenue', 'sourcesay' ) } ) ) ),
			el( 'tbody', null, rows.map( ( r ) => el( 'tr', null, el( 'th', { scope: 'row', text: fmtDay( r.date, true ) } ), el( 'td', { text: fmtNum( r.responses ) } ), el( 'td', { text: fmtMoney( r.revenue ) } ) ) ) )
		);
		const c = card( { title: __( 'Daily trend', 'sourcesay' ), desc: __( 'Answers or revenue from answered orders, per day.', 'sourcesay' ), actions: metricSeg }, box, table );
		requestAnimationFrame( () => drawChart( box, rows ) );
		if ( window.ResizeObserver ) {
			let w = 0;
			new ResizeObserver( () => {
				if ( box.clientWidth && Math.abs( box.clientWidth - w ) > 4 ) {
					w = box.clientWidth;
					drawChart( box, rows );
				}
			} ).observe( box );
		}
		return c;
	}

	function drawChart( box, rows ) {
		box.textContent = '';
		const metric = S.chartMetric;
		const W = Math.max( 260, box.clientWidth || 640 );
		const H = 240;
		const L = metric === 'revenue' ? 52 : 36;
		const Rp = 8;
		const T = 12;
		const B = 28;
		const iw = W - L - Rp;
		const ih = H - T - B;
		const n = Math.max( 1, rows.length );
		const vals = rows.map( ( r ) => +r[ metric ] || 0 );
		const max = niceMax( Math.max( 0, ...vals ), metric === 'responses' );
		const fmt = metric === 'revenue' ? fmtMoneyShort : fmtNum;
		const titleId = uid( 'ct' );
		const descId = uid( 'cd' );
		const total = vals.reduce( ( a, v ) => a + v, 0 );
		const svg = svgEl( 'svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', tabindex: '0', 'aria-labelledby': titleId + ' ' + descId } );
		svg.appendChild( svgEl( 'title', { id: titleId }, metric === 'revenue' ? __( 'Revenue per day', 'sourcesay' ) : __( 'Answers per day', 'sourcesay' ) ) );
		svg.appendChild( svgEl( 'desc', { id: descId }, sprintf( /* translators: 1: total, 2: number of days. */ __( '%1$s in total over %2$s days. Use the left and right arrow keys to read each day. The same data is in the table below the chart.', 'sourcesay' ), metric === 'revenue' ? fmtMoney( total ) : fmtNum( total ), String( rows.length ) ) ) );
		[ 0, 0.5, 1 ].forEach( ( f ) => {
			const y = T + ih - f * ih;
			svg.appendChild( svgEl( 'line', { class: 'ss-chart__grid', x1: L, x2: W - Rp, y1: y, y2: y } ) );
			svg.appendChild( svgEl( 'text', { class: 'ss-chart__axis', x: L - 8, y: y + 4, 'text-anchor': 'end' }, fmt( max * f ) ) );
		} );
		const step = iw / n;
		const bw = Math.max( 2, Math.min( 28, step * 0.62 ) );
		const bars = rows.map( ( r, i ) => {
			const v = +r[ metric ] || 0;
			const h = v > 0 ? Math.max( 2, ( v / max ) * ih ) : 0;
			const rect = svgEl( 'rect', { class: 'ss-chart__bar' + ( metric === 'revenue' ? ' ss-chart__bar--revenue' : '' ), x: L + i * step + ( step - bw ) / 2, y: T + ih - h, width: bw, height: h, rx: Math.min( 4, bw / 2 ) } );
			svg.appendChild( rect );
			return rect;
		} );
		const labels = Math.min( n, Math.max( 2, Math.floor( iw / 72 ) ) );
		const seen = new Set();
		for ( let k = 0; k < labels; k++ ) {
			const i = labels === 1 ? 0 : Math.round( ( k * ( n - 1 ) ) / ( labels - 1 ) );
			if ( seen.has( i ) || ! rows[ i ] ) {
				continue;
			}
			seen.add( i );
			const anchor = k === 0 ? 'start' : ( k === labels - 1 ? 'end' : 'middle' );
			const x = k === 0 ? L : ( k === labels - 1 ? W - Rp : L + i * step + step / 2 );
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
				return;
			}
			bars[ i ].classList.add( 'is-active' );
			const r = rows[ i ];
			tip.textContent = '';
			add( tip, [ el( 'strong', { text: fmtDay( r.date, true ) } ), sprintf( /* translators: %s: number of answers */ _n( '%s answer', '%s answers', +r.responses || 0, 'sourcesay' ), fmtNum( r.responses ) ) + ', ' + fmtMoney( r.revenue ) ] );
			tip.hidden = false;
			const scale = box.clientWidth / W;
			const cx = ( L + i * step + step / 2 ) * scale;
			const h = +bars[ i ].getAttribute( 'height' );
			tip.style.left = Math.min( Math.max( cx, 70 ), box.clientWidth - 70 ) + 'px';
			tip.style.top = ( ( T + ih - h ) * scale ) + 'px';
			announce( tip.textContent );
		};
		svg.addEventListener( 'mousemove', ( e ) => {
			const rect = svg.getBoundingClientRect();
			const x = ( ( e.clientX - rect.left ) / rect.width ) * W;
			const i = Math.floor( ( x - L ) / step );
			if ( i !== active ) {
				show( i >= 0 && i < n ? i : -1 );
			}
		} );
		svg.addEventListener( 'mouseleave', () => show( -1 ) );
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
		return card( { title: __( 'New vs returning', 'sourcesay' ), desc: __( 'Returning means the customer had paid for an earlier order.', 'sourcesay' ) },
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
				el( 'ul', { class: 'ss-answers' }, list.map( ( a ) => el( 'li', { class: 'ss-answer' },
					el( 'span', { class: 'ss-answer__bar', style: 'width:' + ( ( a.count / max ) * 100 ).toFixed( 1 ) + '%' } ),
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
		return card( { title: __( 'What they told us', 'sourcesay' ), desc: __( 'Top follow-up answers per channel and the latest “Other” replies, in the customers’ own words.', 'sourcesay' ) },
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
		if ( S.tab !== 'reports' ) {
			render();
		}
		api( '/admin/settings' ).then( ( r ) => {
			S.saved = r.settings;
			S.presets = r.presets || {};
			S.icons = ( r.icons && r.icons.length ) ? r.icons : ICON_KEYS;
			S.draft = withKeys( r.settings );
			S.accentCustom = !! r.settings.accent;
			S.settingsState = 'ready';
			render();
		} ).catch( ( err ) => {
			S.settingsState = 'error';
			S.settingsErr = err;
			if ( S.tab !== 'reports' ) {
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
			if ( S.tab !== 'reports' ) {
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

		const qCard = card( { title: __( 'Question', 'sourcesay' ) },
			el( 'div', { class: 'ss-stack' },
				toggle( { label: __( 'Ask customers after checkout', 'sourcesay' ), help: __( 'Shows the question on the order confirmation page. Customers can skip it.', 'sourcesay' ), checked: d.enabled, onChange: ( v ) => {
					d.enabled = v;
					changed();
				} } ),
				textField( { label: __( 'Question text', 'sourcesay' ), value: d.question, max: 160, errKey: 'question', onInput: ( v ) => {
					d.question = v;
					changed();
				} } ),
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
		const optsCard = card( { title: __( 'Answers', 'sourcesay' ), desc: __( 'Drag the handle or use the arrow buttons to reorder. Turn an answer off to hide it without deleting it.', 'sourcesay' ) },
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
		const otherCard = card( { title: __( 'Other answer', 'sourcesay' ) },
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

		const lookCard = card( { title: __( 'Look and placement', 'sourcesay' ) },
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
				selectField( { label: __( 'Position on the confirmation page', 'sourcesay' ), value: d.position, options: [ [ 'after', __( 'After the order details', 'sourcesay' ) ], [ 'before', __( 'Before the order details', 'sourcesay' ) ] ], onChange: ( v ) => {
					d.position = v;
					changed();
				} } ),
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
		const previewCard = card( { title: __( 'Preview', 'sourcesay' ), desc: __( 'Try it: click an answer. Your theme sets the final font and colours.', 'sourcesay' ), actions: widthSeg }, R.preview );

		wrap.appendChild( el( 'div', { class: 'ss-builder' },
			el( 'div', { class: 'ss-stack' }, qCard, optsCard, otherCard, lookCard ),
			el( 'div', { class: 'ss-builder__side' }, previewCard )
		) );
		wrap.appendChild( saveBar() );
		renderOpts();
		renderPreview();
		updateErrors();
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
		const keys = [ '' ].concat( S.icons );
		const choose = ( key ) => {
			o.icon = key;
			trigger.textContent = '';
			trigger.appendChild( ico( key || 'plus' ) );
			trigger.classList.toggle( 'is-empty', ! key );
			trigger.setAttribute( 'aria-label', sprintf( /* translators: 1: icon name, 2: answer label */ __( 'Icon: %1$s. Change the icon for %2$s', 'sourcesay' ), key ? ( ICON_LABELS[ key ] || key ) : __( 'none', 'sourcesay' ), o.label || __( 'this answer', 'sourcesay' ) ) );
			closePopover( true );
			changed();
		};
		const btns = keys.map( ( k ) => el( 'button', {
			type: 'button',
			class: 'ss-icon-grid__btn',
			'aria-pressed': String( ( o.icon || '' ) === k ),
			'aria-label': k ? ( ICON_LABELS[ k ] || k ) : __( 'No icon', 'sourcesay' ),
			title: k ? ( ICON_LABELS[ k ] || k ) : __( 'No icon', 'sourcesay' ),
			tabindex: ( o.icon || '' ) === k ? '0' : '-1',
			on: { click: () => choose( k ) },
		}, k ? ico( k ) : el( 'span', { class: 'ss-icon-grid__none', 'aria-hidden': 'true', text: __( 'None', 'sourcesay' ) } ) ) );
		if ( ! btns.some( ( b ) => b.tabIndex === 0 ) ) {
			btns[ 0 ].tabIndex = 0;
		}
		const grid = el( 'div', { class: 'ss-icon-grid' }, btns );
		const node = el( 'div', { class: 'ss-pop', role: 'dialog', 'aria-labelledby': titleId },
			el( 'p', { class: 'ss-pop__title', id: titleId, text: __( 'Choose an icon', 'sourcesay' ) } ),
			grid
		);
		node.addEventListener( 'keydown', ( e ) => {
			if ( e.key === 'Escape' ) {
				e.preventDefault();
				e.stopPropagation();
				closePopover( true );
				return;
			}
			const i = btns.indexOf( document.activeElement );
			if ( i < 0 ) {
				return;
			}
			const map = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 6, ArrowUp: -6, Home: -i, End: btns.length - 1 - i };
			if ( map[ e.key ] === undefined ) {
				if ( e.key === 'Tab' ) {
					closePopover( true );
					e.preventDefault();
				}
				return;
			}
			e.preventDefault();
			const j = Math.min( btns.length - 1, Math.max( 0, i + map[ e.key ] ) );
			btns[ i ].tabIndex = -1;
			btns[ j ].tabIndex = 0;
			btns[ j ].focus();
		} );
		const place = () => {
			const r = trigger.getBoundingClientRect();
			const w = node.offsetWidth || 292;
			const h = node.offsetHeight || 260;
			let top = r.bottom + 6;
			if ( top + h > window.innerHeight - 8 && r.top - h - 6 > 8 ) {
				top = r.top - h - 6;
			}
			node.style.top = top + 'px';
			node.style.left = Math.max( 8, Math.min( r.left, window.innerWidth - w - 8 ) ) + 'px';
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
		btns.find( ( b ) => b.tabIndex === 0 ).focus();
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
		if ( ! d.enabled ) {
			survey = el( 'p', { class: 'ss-frame__off', text: __( 'The survey is turned off. Customers do not see it.', 'sourcesay' ) } );
		} else if ( ! opts.length ) {
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
		if ( d.enabled && opts.length && d.shuffle ) {
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
		el( 'div', { class: 'ss-more' }, fuField, d.other.enabled ? otherField : null, el( 'button', { type: 'submit', class: 'ss-send' }, el( 'span', { text: __( 'Send', 'sourcesay' ) } ) ) )
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
			card( { title: __( 'My Account', 'sourcesay' ) },
				toggle( { label: __( 'Ask again in My Account', 'sourcesay' ), help: __( 'Customers who skipped the question can answer it on My Account > Orders > View for 30 days after ordering.', 'sourcesay' ), checked: d.show_in_account, onChange: ( v ) => {
					d.show_in_account = v;
					changed( { preview: false } );
				} } )
			),
			card( { title: __( 'Data', 'sourcesay' ) },
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
		const right = card( { title: __( 'Privacy', 'sourcesay' ), desc: __( 'Answers stay in your WordPress database. Nothing is sent to SwiftWebDev or anyone else.', 'sourcesay' ) },
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
		wrap.appendChild( el( 'div', { class: 'ss-settings' }, left, right ) );
		wrap.appendChild( devPanel() );
		wrap.appendChild( saveBar() );
	}

	/* ------------------------------------------------------------------ */
	/* Boot                                                               */
	/* ------------------------------------------------------------------ */
	S.tab = tabFromHash();
	render();
	loadSettings();
	loadStatus();
	loadReport();
}() );
